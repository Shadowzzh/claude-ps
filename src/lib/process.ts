import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import type { ProcessInfo } from "../types.js";
import { formatEtime } from "./format.js";
import { getSessionIdFromProcess, getSessionInfo } from "./session.js";

export type { ProcessInfo } from "../types.js";

/**
 * 获取所有 Claude Code 相关进程
 */
export function getClaudeProcesses(): ProcessInfo[] {
	try {
		// 获取所有进程
		const output = execSync("ps -eo pid,pcpu,pmem,etime,args", {
			encoding: "utf-8",
		});

		const lines = output.trim().split("\n").slice(1); // 跳过表头
		const currentPid = process.pid;

		return lines
			.filter((line) => {
				const parts = line.trim().split(/\s+/);
				if (parts.length < 5) return false;

				// 获取命令部分（从第5个元素开始）
				const command = parts.slice(4).join(" ");

				// 匹配以 "claude " 开头的命令（注意空格，避免匹配 claude-ps 等）
				// 或者匹配 "node ... claude" 这种情况
				const isClaudeCommand =
					command.startsWith("claude ") ||
					command === "claude" ||
					(command.includes("node") && command.includes(" claude "));

				// 排除当前进程和其他 claude 工具
				const isNotSelf = !line.includes(String(currentPid));
				const isNotOtherTool =
					!command.includes("claude-ps") && !command.includes("claude-hook");

				return isClaudeCommand && isNotSelf && isNotOtherTool;
			})
			.map((line) => {
				const parts = line.trim().split(/\s+/);
				const [pid, cpu, mem, etime, ...commandParts] = parts;
				const command = commandParts.join(" ");
				const pidNum = Number.parseInt(pid, 10);
				const cwd = getCwd(pidNum);
				const projectName = basename(cwd);
				const projectKey = cwd.replace(/\//g, "-");
				const claudeProjectPath = join(
					homedir(),
					".claude",
					"projects",
					projectKey,
				);

				// 获取会话信息
				const sessionId = getSessionIdFromProcess(pidNum, cwd);
				const session = sessionId
					? (getSessionInfo(cwd, sessionId) ?? undefined)
					: undefined;

				return {
					pid: pidNum,
					cpu: `${cpu}%`,
					mem: `${mem}%`,
					etime: formatEtime(etime),
					cwd,
					command,
					projectName,
					claudeProjectPath,
					session,
				};
			});
	} catch (error) {
		console.error("获取进程列表失败:", error);
		return [];
	}
}

/**
 * 获取进程的工作目录
 */
function getCwd(pid: number): string {
	try {
		const output = execSync(`lsof -p ${pid} 2>/dev/null | grep cwd`, {
			encoding: "utf-8",
		});
		// 输出格式: 进程名 PID 用户 cwd DIR ... 路径
		const parts = output.trim().split(/\s+/);
		return parts[parts.length - 1] || "N/A";
	} catch {
		return "N/A";
	}
}

/**
 * 杀死指定进程
 */
export function killProcess(pid: number): boolean {
	try {
		process.kill(pid, "SIGTERM");
		return true;
	} catch (error) {
		return false;
	}
}
