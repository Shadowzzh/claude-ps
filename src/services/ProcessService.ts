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

	selectProcess(input?: string): ProcessSelectionResult {
		const processes = this.getAllProcesses();

		if (processes.length === 0) {
			return { error: "NO_PROCESSES" };
		}

		if (input) {
			// 1. Try as PID
			const byPid = processes.find((p) => String(p.pid) === input);
			if (byPid) return { process: byPid };

			// 2. Try as exact path match (cwd or claudeProjectPath)
			const byPath = processes.find(
				(p) => p.cwd === input || p.claudeProjectPath === input,
			);
			if (byPath) return { process: byPath };

			return { error: "PID_NOT_FOUND", pid: input };
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

	killProcess(pid: number): void {
		process.kill(pid, "SIGTERM");
	}

	generateMarkdown(sessionData: SessionData): string {
		const { messages, stats, session, projectName } = sessionData;

		let md = "# Claude Code 会话记录\n\n";
		md += `**会话摘要**: ${session.summary}\n`;
		md += `**项目**: ${projectName}\n`;

		if (stats.startTime && stats.endTime) {
			const duration =
				new Date(stats.endTime).getTime() - new Date(stats.startTime).getTime();
			const minutes = Math.floor(duration / 60000);
			const seconds = Math.floor((duration % 60000) / 1000);
			md += `**会话时长**: ${minutes} 分 ${seconds} 秒\n`;
		}

		md += "\n## 统计信息\n\n";
		md += `- 消息总数: ${stats.totalMessages} (用户: ${stats.userMessages}, AI: ${stats.assistantMessages})\n`;
		md += `- Token: 输入 ${stats.totalInputTokens.toLocaleString()} / 输出 ${stats.totalOutputTokens.toLocaleString()}\n`;

		if (stats.thinkingCount > 0) {
			md += `- 思考次数: ${stats.thinkingCount}\n`;
		}

		if (Object.keys(stats.toolCalls).length > 0) {
			const toolsStr = Object.entries(stats.toolCalls)
				.map(([name, count]) => `${name}(${count})`)
				.join(", ");
			md += `- 工具调用: ${toolsStr}\n`;
		}

		md += "\n## 对话历史\n\n";

		for (const msg of messages) {
			const time = new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				hour12: false,
			});

			const role = msg.type === "user" ? "USER" : "AI";
			md += `### [${role}] ${time}\n\n`;

			if (typeof msg.message?.content === "string") {
				md += `${msg.message.content}\n\n`;
			} else if (Array.isArray(msg.message?.content)) {
				for (const item of msg.message.content) {
					if (item.type === "text" && item.text) {
						md += `${item.text}\n\n`;
					} else if (item.type === "thinking" && item.thinking) {
						md += `**[THINKING]**\n\`\`\`\n${item.thinking}\n\`\`\`\n\n`;
					} else if (item.type === "tool_use" && item.name) {
						md += `**[TOOL]** ${item.name}\n`;
						if (item.input) {
							md += `\`\`\`json\n${JSON.stringify(item.input, null, 2)}\n\`\`\`\n\n`;
						}
					} else if (item.type === "tool_result") {
						const content =
							typeof item.content === "string"
								? item.content
								: JSON.stringify(item.content, null, 2);
						md += `**[TOOL_RESULT]**\n\`\`\`\n${content}\n\`\`\`\n\n`;
					}
				}
			}
		}

		return md;
	}
}

export function isProcessFound(
	result: ProcessSelectionResult,
): result is { process: ProcessInfo } {
	return "process" in result;
}
