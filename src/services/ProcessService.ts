import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { getClaudeProcesses } from "../lib/process.js";
import { calculateStats, parseSessionMessages } from "../lib/sessionParser.js";
import type { HistorySession, ProcessInfo, SessionInfo } from "../types.js";

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

	/**
	 * Get project directory path from project path
	 */
	#getProjectDir(projectPath: string): string | null {
		const projectKey = projectPath.replace(/\//g, "-");
		const projectDir = join(homedir(), ".claude", "projects", projectKey);
		if (!existsSync(projectDir)) {
			return null;
		}
		return projectDir;
	}

	/**
	 * Get all history sessions for a project
	 * Returns sessions sorted by modified time (newest first)
	 */
	getHistorySessions(projectPath: string): HistorySession[] | null {
		const projectDir = this.#getProjectDir(projectPath);
		if (!projectDir) {
			return null;
		}

		try {
			const entries = readdirSync(projectDir, { withFileTypes: true });
			const sessions: HistorySession[] = [];

			for (const entry of entries) {
				// Only process .jsonl files (session files)
				if (!entry.isFile() || !entry.name.endsWith(".jsonl")) {
					continue;
				}

				const sessionId = entry.name.slice(0, -6); // Remove .jsonl extension
				const filePath = join(projectDir, entry.name);
				const stats = statSync(filePath);

				// Parse session file to get message count and summary
				const sessionInfo = this.#parseSessionFile(filePath, sessionId);
				if (sessionInfo) {
					sessions.push({
						id: sessionId,
						summary: sessionInfo.summary,
						messageCount: sessionInfo.messageCount,
						created: sessionInfo.created,
						modified: stats.mtime.toISOString(),
						filePath,
					});
				}
			}

			// Sort by modified time (newest first)
			sessions.sort((a, b) => b.modified.localeCompare(a.modified));

			return sessions;
		} catch {
			return null;
		}
	}

	/**
	 * Parse session file to get basic info
	 */
	#parseSessionFile(
		filePath: string,
		sessionId: string,
	): {
		summary: string;
		messageCount: number;
		created: string;
	} | null {
		try {
			const content = readFileSync(filePath, "utf-8");
			const lines = content.trim().split("\n");

			let messageCount = 0;
			let created = "";
			let lastUserMessage = "";

			for (const line of lines) {
				try {
					const record = JSON.parse(line);
					if (record.type === "user" || record.type === "assistant") {
						messageCount++;
						if (!created && record.timestamp) {
							created = record.timestamp;
						}
						if (record.type === "user" && record.message?.content) {
							const content =
								typeof record.message.content === "string"
									? record.message.content
									: record.message.content
											.filter(
												(item: unknown) =>
													typeof item === "object" &&
													item &&
													"type" in item &&
													item.type === "text" &&
													"text" in item,
											)
											.map((item: unknown) => (item as { text: string }).text)
											.join("") || "";
							if (content) {
								lastUserMessage = content;
							}
						}
					}
				} catch {
					// Ignore parse errors
				}
			}

			// Clean markdown tags from summary
			const cleanedSummary = lastUserMessage
				.replace(/^#{1,6}\s+/gm, "") // Remove headers
				.replace(/^[-*+]\s+/gm, "") // Remove list markers
				.replace(/^\d+\.\s+/gm, "") // Remove numbered list
				.replace(/^>\s+/gm, "") // Remove blockquote
				.replace(/`[^`]+`/g, "") // Remove inline code
				.replace(/\n+/g, " ") // Replace newlines with space
				.trim();

			return {
				summary:
					cleanedSummary.substring(0, 50) +
					(cleanedSummary.length > 50 ? "..." : ""),
				messageCount,
				created,
			};
		} catch {
			return null;
		}
	}

	/**
	 * Get history session data by session ID
	 */
	getHistorySessionData(
		projectPath: string,
		sessionId: string,
	): SessionData | null {
		const projectDir = this.#getProjectDir(projectPath);
		if (!projectDir) {
			return null;
		}

		const sessionFilePath = join(projectDir, `${sessionId}.jsonl`);
		if (!existsSync(sessionFilePath)) {
			return null;
		}

		// Parse session file to get summary
		const sessionInfo = this.#parseSessionFile(sessionFilePath, sessionId);
		if (!sessionInfo) {
			return null;
		}

		// Parse messages and calculate stats
		const messages = parseSessionMessages(projectPath, sessionId);
		const stats = calculateStats(messages);

		const projectName = basename(projectPath);

		return {
			messages,
			stats,
			session: {
				sessionId,
				summary: sessionInfo.summary,
				messageCount: sessionInfo.messageCount,
				created: sessionInfo.created,
				modified: statSync(sessionFilePath).mtime.toISOString(),
			},
			projectName,
		};
	}

	/**
	 * Filter messages based on options
	 */
	filterMessages(
		messages: ReturnType<typeof parseSessionMessages>,
		options: {
			userOnly?: boolean;
			aiOnly?: boolean;
			tools?: boolean;
			noThinking?: boolean;
		},
	): ReturnType<typeof parseSessionMessages> {
		let filtered = messages;

		// Filter by role
		if (options.userOnly) {
			filtered = filtered.filter((msg) => msg.type === "user");
		} else if (options.aiOnly) {
			filtered = filtered.filter((msg) => msg.type === "assistant");
		} else if (options.tools) {
			filtered = filtered.filter((msg) => {
				if (msg.type !== "assistant") return false;
				if (!Array.isArray(msg.message?.content)) return false;
				return msg.message.content.some(
					(item) => item.type === "tool_use" || item.type === "tool_result",
				);
			});
		}

		// Filter out thinking if requested
		if (options.noThinking && !options.tools) {
			filtered = filtered.map((msg) => {
				if (msg.type === "assistant" && Array.isArray(msg.message?.content)) {
					return {
						...msg,
						message: {
							...msg.message,
							content: msg.message.content.filter(
								(item) => item.type !== "thinking",
							),
						},
					};
				}
				return msg;
			});
		}

		return filtered;
	}

	/**
	 * Parse jsonl file directly from file path
	 */
	parseJsonlFile(
		filePath: string,
		maxSize = 50 * 1024 * 1024,
	): SessionData | null {
		if (!existsSync(filePath)) {
			return null;
		}

		// Check file size before reading
		const fileStats = statSync(filePath);
		if (fileStats.size > maxSize) {
			return null;
		}

		try {
			const content = readFileSync(filePath, "utf-8");
			const lines = content.trim().split("\n");
			const messages: ReturnType<typeof parseSessionMessages> = [];

			for (const line of lines) {
				try {
					const record = JSON.parse(line);
					if (record.type === "user" || record.type === "assistant") {
						messages.push(record);
					}
				} catch {
					// Ignore parse errors
				}
			}

			if (messages.length === 0) {
				return null;
			}

			const stats = calculateStats(messages);
			const sessionId = basename(filePath, ".jsonl");

			// Extract summary from first user message
			let summary = "Session";
			for (const msg of messages) {
				if (msg.type === "user" && msg.message?.content) {
					const content =
						typeof msg.message.content === "string"
							? msg.message.content
							: msg.message.content
									.filter(
										(item: unknown) =>
											typeof item === "object" &&
											item &&
											"type" in item &&
											item.type === "text" &&
											"text" in item,
									)
									.map((item: unknown) => (item as { text: string }).text)
									.join("") || "";
					if (content) {
						const cleanedSummary = content
							.replace(/^#{1,6}\s+/gm, "")
							.replace(/^[-*+]\s+/gm, "")
							.replace(/^\d+\.\s+/gm, "")
							.replace(/^>\s+/gm, "")
							.replace(/`[^`]+`/g, "")
							.replace(/\n+/g, " ")
							.trim();
						summary =
							cleanedSummary.substring(0, 50) +
							(cleanedSummary.length > 50 ? "..." : "");
						break;
					}
				}
			}

			return {
				messages,
				stats,
				session: {
					sessionId,
					summary,
					messageCount: messages.length,
					created: stats.startTime,
					modified: statSync(filePath).mtime.toISOString(),
				},
				projectName: basename(filePath, ".jsonl"),
			};
		} catch {
			return null;
		}
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
