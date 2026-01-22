import { readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { SessionMessage } from "../types";

/**
 * 将工作目录路径转换为 Claude 项目目录名
 * @param cwd 工作目录路径，如 /Users/zzh/code/foo
 * @returns 项目目录名，如 -Users-zzh-code-foo
 */
function cwdToProjectDir(cwd: string): string {
	return cwd.replace(/\//g, "-").replace(/^-/, "-");
}

/**
 * 根据工作目录获取会话文件路径
 * 如果提供了进程启动时间，会尝试匹配创建时间最接近的会话文件
 * @param cwd 工作目录
 * @param startTime 进程启动时间（可选）
 * @returns 会话文件绝对路径，未找到返回空字符串
 */
export async function getSessionPath(
	cwd: string,
	startTime?: Date,
): Promise<string> {
	const projectDir = cwdToProjectDir(cwd);
	const sessionsDir = join(homedir(), ".claude", "projects", projectDir);

	try {
		const files = await readdir(sessionsDir);
		const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

		if (jsonlFiles.length === 0) return "";

		// 获取每个文件的创建时间、修改时间和大小
		const { stat } = await import("node:fs/promises");
		const fileStats = await Promise.all(
			jsonlFiles.map(async (f) => {
				const path = join(sessionsDir, f);
				const s = await stat(path);
				return {
					path,
					birthtime: s.birthtime,
					mtimeMs: s.mtimeMs,
					size: s.size,
				};
			}),
		);

		// 过滤掉太小的文件（< 1KB 通常是空会话或只有 summary）
		const minSize = 1024;
		const validFiles = fileStats.filter((f) => f.size >= minSize);

		// 如果提供了启动时间，尝试在有效文件中匹配
		if (startTime && validFiles.length > 0) {
			const startMs = startTime.getTime();

			// 策略1: 基于创建时间匹配（新建会话场景，10秒容差）
			const birthtimeThreshold = 10000;
			const birthtimeMatched = validFiles
				.filter(
					(f) => Math.abs(f.birthtime.getTime() - startMs) < birthtimeThreshold,
				)
				.sort((a, b) => b.mtimeMs - a.mtimeMs);

			if (birthtimeMatched.length > 0) {
				return birthtimeMatched[0].path;
			}

			// 策略2: 基于修改时间匹配（resume 会话场景，60秒容差）
			// resume 时会立即写入会话文件，所以修改时间会与启动时间接近
			const mtimeThreshold = 60000;
			const mtimeMatched = validFiles
				.filter((f) => {
					const mtimeDiff = f.mtimeMs - startMs;
					// 修改时间在启动时间之后，且在容差内
					return mtimeDiff >= 0 && mtimeDiff < mtimeThreshold;
				})
				.sort((a, b) => a.mtimeMs - b.mtimeMs); // 选择启动后最先被修改的

			if (mtimeMatched.length > 0) {
				return mtimeMatched[0].path;
			}
		}

		// 回退：返回最新修改的文件（优先有效文件，否则所有文件）
		const fallbackFiles = validFiles.length > 0 ? validFiles : fileStats;
		fallbackFiles.sort((a, b) => b.mtimeMs - a.mtimeMs);
		return fallbackFiles[0]?.path || "";
	} catch {
		return "";
	}
}

/**
 * 从会话文件中提取最近的消息
 * @param sessionPath 会话文件路径
 * @param limit 返回消息数量上限，默认 5
 * @returns 最近的会话消息数组
 */
export async function getRecentMessages(
	sessionPath: string,
	limit = 5,
): Promise<SessionMessage[]> {
	if (!sessionPath) return [];

	try {
		const content = await readFile(sessionPath, "utf-8");
		const lines = content.trim().split("\n");
		const messages: SessionMessage[] = [];

		for (const line of lines) {
			try {
				const entry = JSON.parse(line);

				if (entry.type === "user" && entry.message?.content) {
					const text = extractUserText(entry.message.content);
					if (text && !isMetaMessage(text)) {
						messages.push({
							role: "user",
							content: truncate(text, 100),
							timestamp: entry.timestamp || "",
						});
					}
				} else if (entry.type === "assistant" && entry.message?.content) {
					const text = extractAssistantText(entry.message.content);
					if (text) {
						messages.push({
							role: "assistant",
							content: truncate(text, 100),
							timestamp: entry.timestamp || "",
						});
					}
				}
			} catch {
				// 跳过无效行
			}
		}

		return messages.slice(-limit);
	} catch {
		return [];
	}
}

/**
 * 从用户消息内容中提取文本
 * @param content 消息内容（字符串或数组）
 * @returns 提取的文本，非字符串返回空
 */
function extractUserText(content: unknown): string {
	if (typeof content === "string") {
		return content;
	}
	// 数组形式（tool_result 等）跳过
	return "";
}

/**
 * 从助手消息内容中提取文本
 * @param content 消息内容数组
 * @returns 合并后的文本内容
 */
function extractAssistantText(content: unknown): string {
	if (!Array.isArray(content)) return "";

	const textParts = content
		.filter((item) => item.type === "text" && item.text)
		.map((item) => item.text);

	return textParts.join("\n");
}

/**
 * 判断是否为元数据消息（命令输出等）
 * @param text 消息文本
 * @returns 是否为元数据消息
 */
function isMetaMessage(text: string): boolean {
	return (
		text.startsWith("<local-command") ||
		text.startsWith("<command-name>") ||
		text.startsWith("<command-message>")
	);
}

/**
 * 截断文本到指定长度
 * @param text 原始文本
 * @param maxLen 最大长度
 * @returns 截断后的文本，超长部分用 ... 替代
 */
function truncate(text: string, maxLen: number): string {
	// 移除换行，压缩空白
	const clean = text.replace(/\s+/g, " ").trim();
	if (clean.length <= maxLen) return clean;
	return `${clean.slice(0, maxLen - 3)}...`;
}
