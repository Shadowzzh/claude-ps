import { getClaudeProcesses } from "../lib/process.js";
import { calculateStats, parseSessionMessages } from "../lib/sessionParser.js";
import type { ProcessInfo } from "../types.js";

export type ProcessSelectionResult =
	| { process: ProcessInfo }
	| { error: "NO_PROCESSES" }
	| { error: "PID_NOT_FOUND"; pid: string }
	| { error: "MULTIPLE_PROCESSES"; processes: ProcessInfo[] };

export interface SessionData {
	messages: ReturnType<typeof parseSessionMessages>;
	stats: ReturnType<typeof calculateStats>;
	session: NonNullable<ProcessInfo["session"]>;
	projectName: string;
}

/**
 * 进程管理服务层
 *
 * 统一管理 CLI 和 TUI 的进程相关业务逻辑
 * - 进程查询和选择
 * - 会话数据获取和解析
 * - 错误处理标准化
 */
export class ProcessService {
	getAllProcesses(): ProcessInfo[] {
		return getClaudeProcesses();
	}

	selectProcess(pid?: string): ProcessSelectionResult {
		const processes = this.getAllProcesses();

		if (processes.length === 0) {
			return { error: "NO_PROCESSES" };
		}

		if (pid) {
			const proc = processes.find((p) => String(p.pid) === pid);
			return proc ? { process: proc } : { error: "PID_NOT_FOUND", pid };
		}

		if (processes.length === 1) {
			return { process: processes[0] };
		}

		return { error: "MULTIPLE_PROCESSES", processes };
	}

	getSessionData(proc: ProcessInfo): SessionData | null {
		if (!proc.session) return null;

		const messages = parseSessionMessages(proc.cwd, proc.session.sessionId);
		const stats = calculateStats(messages);

		return {
			messages,
			stats,
			session: proc.session,
			projectName: proc.projectName,
		};
	}
}
