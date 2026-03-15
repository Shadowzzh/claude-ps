import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { SessionInfo } from "../types.js";

/**
 * 通过 PID 从映射文件获取会话 ID
 */
export function getSessionIdFromPid(pid: number): string | null {
	try {
		const mappingPath = join(homedir(), ".claude", "session-mappings.jsonl");
		if (!existsSync(mappingPath)) {
			return null;
		}

		const content = readFileSync(mappingPath, "utf-8");
		const lines = content.trim().split("\n").reverse();

		// 从后往前查找匹配 PID 的记录
		for (const line of lines) {
			try {
				const record = JSON.parse(line);
				if (record.pid === pid && record.sessionId) {
					return record.sessionId;
				}
			} catch {
				// ignore parse errors
			}
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * 获取进程的会话 ID（优先使用 PID 映射）
 */
export function getSessionIdFromProcess(
	pid: number,
	cwd: string,
): string | null {
	// 优先从 PID 映射获取
	const sessionId = getSessionIdFromPid(pid);
	if (sessionId) {
		return sessionId;
	}

	// Fallback: 从 history.jsonl 获取（可能不准确）
	return getSessionIdFromHistory(cwd);
}

/**
 * 从 history.jsonl 获取项目的最新会话 ID
 */
function getSessionIdFromHistory(projectPath: string): string | null {
	try {
		const historyPath = join(homedir(), ".claude", "history.jsonl");
		if (!existsSync(historyPath)) {
			return null;
		}

		const content = readFileSync(historyPath, "utf-8");
		const lines = content.trim().split("\n");

		// 从后往前查找匹配项目路径的记录
		for (let i = lines.length - 1; i >= 0; i--) {
			try {
				const record = JSON.parse(lines[i]);
				if (record.project === projectPath && record.sessionId) {
					return record.sessionId;
				}
			} catch {
				// ignore parse errors
			}
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * 从 history.jsonl 获取会话的最后一条用户消息
 */
function getLastUserMessage(sessionId: string): string | null {
	try {
		const historyPath = join(homedir(), ".claude", "history.jsonl");
		if (!existsSync(historyPath)) {
			return null;
		}

		const content = readFileSync(historyPath, "utf-8");
		const lines = content.trim().split("\n");

		// 从后往前查找匹配会话 ID 的最后一条记录
		for (let i = lines.length - 1; i >= 0; i--) {
			try {
				const record = JSON.parse(lines[i]);
				if (record.sessionId === sessionId && record.display) {
					return record.display;
				}
			} catch {
				// ignore parse errors
			}
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * 获取会话信息
 */
export function getSessionInfo(
	projectPath: string,
	sessionId: string,
): SessionInfo | null {
	try {
		const lastMessage = getLastUserMessage(sessionId);
		const sessionFilePath = getSessionFilePath(projectPath, sessionId);

		if (!existsSync(sessionFilePath)) {
			return {
				sessionId,
				summary: lastMessage || "N/A",
				messageCount: 0,
				created: "",
				modified: "",
			};
		}

		const content = readFileSync(sessionFilePath, "utf-8");
		const lines = content.trim().split("\n");

		// 统计消息数（user 和 assistant 类型）
		let messageCount = 0;
		let created = "";
		let modified = "";

		for (const line of lines) {
			try {
				const record = JSON.parse(line);
				if (record.type === "user" || record.type === "assistant") {
					messageCount++;
					if (!created && record.timestamp) {
						created = record.timestamp;
					}
					if (record.timestamp) {
						modified = record.timestamp;
					}
				}
			} catch {
				// ignore parse errors
			}
		}

		return {
			sessionId,
			summary: lastMessage || "N/A",
			messageCount,
			created,
			modified,
		};
	} catch {
		return null;
	}
}

/**
 * 获取会话文件路径
 */
function getSessionFilePath(projectPath: string, sessionId: string): string {
	const projectKey = projectPath.replace(/\//g, "-");
	return join(
		homedir(),
		".claude",
		"projects",
		projectKey,
		`${sessionId}.jsonl`,
	);
}
