import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { ClaudeProcess } from "../types";

const execAsync = promisify(exec);

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
 * 获取指定进程的工作目录
 * @param pid 进程 ID
 * @returns 工作目录绝对路径，失败返回空字符串
 */
async function getProcessCwd(pid: number): Promise<string> {
	try {
		const { stdout } = await execAsync(`lsof -p ${pid} 2>/dev/null | grep cwd`);
		const match = stdout.trim().match(/\s(\/.+)$/);
		return match ? match[1] : "";
	} catch {
		return "";
	}
}

/**
 * 获取进程的 CPU、内存使用率和运行时长
 * @param pid 进程 ID
 * @returns 包含 cpu、memory、elapsed 的对象
 */
async function getProcessStats(
	pid: number,
): Promise<{ cpu: number; memory: number; elapsed: string }> {
	try {
		const { stdout } = await execAsync(
			`ps -p ${pid} -o %cpu,%mem,etime 2>/dev/null`,
		);
		const lines = stdout.trim().split("\n");
		if (lines.length < 2) return { cpu: 0, memory: 0, elapsed: "" };

		const parts = lines[1].trim().split(/\s+/);
		return {
			cpu: Number.parseFloat(parts[0]) || 0,
			memory: Number.parseFloat(parts[1]) || 0,
			elapsed: parts[2] || "",
		};
	} catch {
		return { cpu: 0, memory: 0, elapsed: "" };
	}
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
	const processes: ClaudeProcess[] = [];

	for (const line of lines) {
		const match = line.trim().match(/^(\d+)\s+(\S+)\s+(.+)$/);
		if (!match) continue;

		const pid = Number.parseInt(match[1]);
		const tty = match[2];

		// 并行获取进程详情
		const [cwd, stats] = await Promise.all([
			getProcessCwd(pid),
			getProcessStats(pid),
		]);

		const isOrphan = tty === "??" || tty === "?";
		const isCurrent = currentTty !== "" && tty === currentTty;

		processes.push({
			pid,
			tty,
			cwd: cwd || "未知",
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
