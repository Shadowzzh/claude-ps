import { exec } from "node:child_process";
import { promisify } from "node:util";
import pLimit from "p-limit";
import type { ClaudeProcess } from "../types";

const execAsync = promisify(exec);

// 并发限制：最多同时进行 8 个子进程调用
const processLimit = pLimit(8);

/**
 * 获取当前终端的 TTY 名称
 * @returns TTY 名称，如 "ttys001"，失败返回空字符串
 */
async function getCurrentTty(): Promise<string> {
	try {
		const { stdout } = await execAsync("tty");
		return stdout.trim().replace("/dev/", "");
	} catch {
		return "";
	}
}

/**
 * 批量获取多个进程的工作目录
 * @param pids 进程 ID 数组
 * @returns 进程 ID 到工作目录的映射
 */
async function batchGetProcessCwd(
	pids: number[],
): Promise<Map<number, string>> {
	if (pids.length === 0) return new Map();

	return processLimit(async () => {
		try {
			const pidList = pids.join(",");
			const { stdout } = await execAsync(
				`lsof -p ${pidList} 2>/dev/null | grep cwd`,
			);

			const result = new Map<number, string>();
			const lines = stdout.trim().split("\n");

			for (const line of lines) {
				// 解析 lsof 输出：格式为 "command pid user fd type device size off node cwd"
				const parts = line.trim().split(/\s+/);
				if (parts.length >= 9) {
					const pid = Number.parseInt(parts[1], 10);
					const cwd = parts[8];
					if (cwd.startsWith("/")) {
						result.set(pid, cwd);
					}
				}
			}

			return result;
		} catch {
			return new Map();
		}
	});
}

/**
 * 批量获取多个进程的 CPU、内存使用率和运行时长
 * @param pids 进程 ID 数组
 * @returns 进程 ID 到统计信息的映射
 */
async function batchGetProcessStats(
	pids: number[],
): Promise<Map<number, { cpu: number; memory: number; elapsed: string }>> {
	if (pids.length === 0) return new Map();

	return processLimit(async () => {
		try {
			const pidList = pids.join(",");
			const { stdout } = await execAsync(
				`ps -p ${pidList} -o pid,%cpu,%mem,etime 2>/dev/null`,
			);

			const result = new Map<
				number,
				{ cpu: number; memory: number; elapsed: string }
			>();
			const lines = stdout.trim().split("\n");

			// 跳过标题行
			for (let i = 1; i < lines.length; i++) {
				const parts = lines[i].trim().split(/\s+/);
				if (parts.length >= 4) {
					const pid = Number.parseInt(parts[0], 10);
					result.set(pid, {
						cpu: Number.parseFloat(parts[1]) || 0,
						memory: Number.parseFloat(parts[2]) || 0,
						elapsed: parts[3] || "",
					});
				}
			}

			return result;
		} catch {
			return new Map();
		}
	});
}

/**
 * 将 ps 的 elapsed 时间格式转换为 Date 对象
 * @param elapsed 格式为 [[DD-]HH:]MM:SS 的时间字符串
 * @returns 进程启动时间的 Date 对象
 */
function parseElapsedToDate(elapsed: string): Date {
	const now = new Date();
	const parts = elapsed.split(/[-:]/);
	let seconds = 0;

	if (parts.length === 2) {
		// MM:SS
		seconds = Number.parseInt(parts[0]) * 60 + Number.parseInt(parts[1]);
	} else if (parts.length === 3) {
		// HH:MM:SS
		seconds =
			Number.parseInt(parts[0]) * 3600 +
			Number.parseInt(parts[1]) * 60 +
			Number.parseInt(parts[2]);
	} else if (parts.length === 4) {
		// DD-HH:MM:SS
		seconds =
			Number.parseInt(parts[0]) * 86400 +
			Number.parseInt(parts[1]) * 3600 +
			Number.parseInt(parts[2]) * 60 +
			Number.parseInt(parts[3]);
	}

	return new Date(now.getTime() - seconds * 1000);
}

/**
 * 获取所有运行中的 Claude Code 进程
 * @returns Claude 进程信息数组
 */
export async function getClaudeProcesses(): Promise<ClaudeProcess[]> {
	const currentTty = await getCurrentTty();

	// 查找所有 claude 进程（排除 chrome-native-host 等后台进程）
	let stdout: string;
	try {
		const result = await execAsync(
			`ps -eo pid,tty,command | grep -E '^\\s*[0-9]+\\s+\\S+\\s+claude(\\s|$)' | grep -v 'chrome-native-host' | grep -v grep`,
		);
		stdout = result.stdout;
	} catch {
		// grep 没找到匹配时返回退出码 1
		return [];
	}

	const lines = stdout.trim().split("\n").filter(Boolean);
	if (lines.length === 0) return [];

	// 解析基本信息
	const basicInfo: Array<{ pid: number; tty: string }> = [];
	for (const line of lines) {
		const match = line.trim().match(/^(\d+)\s+(\S+)\s+(.+)$/);
		if (match) {
			basicInfo.push({
				pid: Number.parseInt(match[1]),
				tty: match[2],
			});
		}
	}

	if (basicInfo.length === 0) return [];

	// 批量获取所有进程的 cwd 和 stats
	const pids = basicInfo.map((p) => p.pid);
	const [cwdMap, statsMap] = await Promise.all([
		batchGetProcessCwd(pids),
		batchGetProcessStats(pids),
	]);

	// 组装结果
	const processes: ClaudeProcess[] = [];
	for (const info of basicInfo) {
		const cwd = cwdMap.get(info.pid) || "未知";
		const stats = statsMap.get(info.pid) || {
			cpu: 0,
			memory: 0,
			elapsed: "",
		};

		const isOrphan = info.tty === "??" || info.tty === "?";
		const isCurrent = currentTty !== "" && info.tty === currentTty;

		processes.push({
			pid: info.pid,
			tty: info.tty,
			cwd,
			isCurrent,
			isOrphan,
			cpu: stats.cpu,
			memory: stats.memory,
			elapsed: stats.elapsed,
			startTime: parseElapsedToDate(stats.elapsed),
			sessionPath: "",
		});
	}

	return processes;
}

/**
 * 终止指定进程
 * @param pid 进程 ID
 * @param force 是否强制终止（SIGKILL），默认使用 SIGTERM
 * @returns 是否成功终止
 */
export async function killProcess(
	pid: number,
	force = false,
): Promise<boolean> {
	try {
		const signal = force ? "KILL" : "TERM";
		await execAsync(`kill -${signal} ${pid}`);
		return true;
	} catch {
		return false;
	}
}
