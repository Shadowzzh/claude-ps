import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import pLimit from "p-limit";
import type { SessionFile, SessionMessage } from "../types";
import { FileCache } from "./cache";

// 并发限制：最多同时进行 10 个文件 stat 操作
const statLimit = pLimit(10);

/**
 * 会话文件内容缓存
 * 缓存已读取的文件内容，避免重复读取
 */
const sessionContentCache = new FileCache<string>({
	maxSize: 50,
	ttl: 5 * 60 * 1000, // 5 分钟
	loader: async (path: string) => {
		return readFile(path, "utf-8");
	},
});

/**
 * 最大保留的消息数量
 * 超过此数量时,只保留最新的消息
 */
const MAX_MESSAGES = 500;

/**
 * 会话文件元数据
 */
interface SessionMetadata {
	/** 第一条消息的时间戳（毫秒） */
	firstMessageTime: number | null;
	/** 最后一条消息的时间戳（毫秒） */
	lastMessageTime: number | null;
	/** 消息总数（不包括 file-history-snapshot 等元数据） */
	messageCount: number;
}

/**
 * 会话元数据缓存
 */
const metadataCache = new FileCache<SessionMetadata>({
	maxSize: 50,
	ttl: 5 * 60 * 1000, // 5 分钟
	loader: async (path: string) => {
		return getSessionMetadata(path);
	},
});

/**
 * 提取会话文件的元数据（消息时间戳和数量）
 * 优化：只读取文件的前10行和后10行，避免读取整个文件
 * @param filePath 会话文件路径
 * @returns 会话元数据
 */
async function getSessionMetadata(filePath: string): Promise<SessionMetadata> {
	try {
		const content = await readFile(filePath, "utf-8");
		const lines = content.trim().split("\n");

		let firstMessageTime: number | null = null;
		let lastMessageTime: number | null = null;
		let messageCount = 0;

		// 优化：只检查前10行和后10行
		const linesToCheck =
			lines.length <= 20 ? lines : [...lines.slice(0, 10), ...lines.slice(-10)];

		for (const line of linesToCheck) {
			try {
				const entry = JSON.parse(line);
				// 只统计用户和助手消息，忽略 file-history-snapshot 等元数据
				if (entry.type === "user" || entry.type === "assistant") {
					messageCount++;
					if (entry.timestamp) {
						const timestamp = new Date(entry.timestamp).getTime();
						if (!firstMessageTime) {
							firstMessageTime = timestamp;
						}
						lastMessageTime = timestamp;
					}
				}
			} catch {
				// 跳过无效行
			}
		}

		return { firstMessageTime, lastMessageTime, messageCount };
	} catch {
		return { firstMessageTime: null, lastMessageTime: null, messageCount: 0 };
	}
}

/**
 * 计算文件的匹配置信度得分
 * @param file 文件统计信息
 * @param metadata 会话元数据
 * @param processStartTime 进程启动时间（毫秒）
 * @returns 置信度得分（0-100）
 */
function calculateConfidenceScore(
	file: { birthtime: Date; mtimeMs: number; size: number },
	metadata: SessionMetadata,
	processStartTime: number,
): number {
	let score = 0;

	// 判断是新建会话还是 resume 会话
	const birthDiff = Math.abs(file.birthtime.getTime() - processStartTime);
	const isNewSession = birthDiff < 600000; // 10分钟内创建的视为新会话

	if (isNewSession) {
		// 新建会话场景：创建时间权重更高（0-50分）
		if (birthDiff < 60000)
			score += 50; // 1分钟内：满分
		else if (birthDiff < 300000)
			score += 40; // 5分钟内：40分
		else if (birthDiff < 600000) score += 30; // 10分钟内：30分

		// 修改时间匹配度（0-20分）
		const mtimeDiff = Math.abs(file.mtimeMs - processStartTime);
		if (mtimeDiff < 60000)
			score += 20; // 1分钟内：满分
		else if (mtimeDiff < 300000)
			score += 15; // 5分钟内：15分
		else if (mtimeDiff < 600000) score += 10; // 10分钟内：10分
	} else {
		// Resume 会话场景：修改时间和内容活跃度权重更高
		// 修改时间匹配度（0-50分）
		const mtimeDiff = Math.abs(file.mtimeMs - processStartTime);
		if (mtimeDiff < 60000)
			score += 50; // 1分钟内：满分
		else if (mtimeDiff < 300000)
			score += 40; // 5分钟内：40分
		else if (mtimeDiff < 600000)
			score += 30; // 10分钟内：30分
		else if (mtimeDiff < 1800000) score += 20; // 30分钟内：20分
	}

	// 内容活跃度（0-20分）
	if (metadata.lastMessageTime) {
		const lastMsgDiff = Math.abs(metadata.lastMessageTime - processStartTime);
		if (lastMsgDiff < 60000)
			score += 20; // 1分钟内：满分
		else if (lastMsgDiff < 300000)
			score += 15; // 5分钟内：15分
		else if (lastMsgDiff < 600000)
			score += 10; // 10分钟内：10分
		else if (lastMsgDiff < 1800000) score += 5; // 30分钟内：5分
	}

	// 消息数量（0-10分）
	if (metadata.messageCount > 10)
		score += 10; // 有实质对话：满分
	else if (metadata.messageCount > 5)
		score += 7; // 有一些对话：7分
	else if (metadata.messageCount > 0)
		score += 3; // 有消息但很少：3分
	else if (isNewSession && birthDiff < 60000) score += 5; // 新建会话且时间非常接近，即使没有消息也给一些分

	return score;
}

/**
 * 将工作目录路径转换为 Claude 项目目录名
 * Claude Code 的实际规则：替换 /、_、. 为 -
 * @param cwd 工作目录路径，如 /Users/zzh/code/foo
 * @returns 项目目录名，如 -Users-zzh-code-foo
 */
function cwdToProjectDir(cwd: string): string {
	return cwd.replace(/[\/_.]/g, "-").replace(/^-+/, "-");
}

/**
 * 项目目录匹配缓存
 * 避免重复扫描和计算
 */
const projectDirCache = new Map<string, string>();

/**
 * 生成多种可能的项目目录名（用于容错匹配）
 * @param cwd 工作目录路径
 * @returns 可能的目录名数组，按优先级排序
 */
function generateProjectDirVariants(cwd: string): string[] {
	const variants: string[] = [];

	// 规则1：正确的规则（替换 /、_、.）
	variants.push(cwd.replace(/[\/_.]/g, "-").replace(/^-+/, "-"));

	// 规则2：旧规则（只替换 /）
	variants.push(cwd.replace(/\//g, "-").replace(/^-+/, "-"));

	// 规则3：替换 / 和 _（不替换 .）
	variants.push(cwd.replace(/[\/_ ]/g, "-").replace(/^-+/, "-"));

	// 规则4：替换 / 和 .（不替换 _）
	variants.push(cwd.replace(/[\/. ]/g, "-").replace(/^-+/, "-"));

	// 去重
	return [...new Set(variants)];
}

/**
 * 在 projects 目录中查找最匹配的项目目录
 * @param cwd 工作目录路径
 * @returns 找到的项目目录名，未找到返回 null
 */
async function findBestMatchingProjectDir(cwd: string): Promise<string | null> {
	// 检查缓存
	if (projectDirCache.has(cwd)) {
		return projectDirCache.get(cwd) || null;
	}

	const projectsDir = join(homedir(), ".claude", "projects");

	try {
		const allDirs = await readdir(projectsDir);
		const variants = generateProjectDirVariants(cwd);

		// 1. 精确匹配
		for (const variant of variants) {
			if (allDirs.includes(variant)) {
				projectDirCache.set(cwd, variant);
				return variant;
			}
		}

		// 2. 模糊匹配：计算相似度
		const cwdParts = cwd.split("/").filter(Boolean);
		const scores = allDirs.map((dir) => {
			const dirParts = dir.split("-").filter(Boolean);
			let matchCount = 0;

			for (const part of cwdParts) {
				if (dirParts.some((dp) => dp.includes(part) || part.includes(dp))) {
					matchCount++;
				}
			}

			return { dir, score: matchCount / cwdParts.length };
		});

		// 选择相似度 > 0.7 的最佳匹配
		scores.sort((a, b) => b.score - a.score);
		if (scores[0] && scores[0].score > 0.7) {
			projectDirCache.set(cwd, scores[0].dir);
			return scores[0].dir;
		}

		return null;
	} catch {
		return null;
	}
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
	let projectDir = cwdToProjectDir(cwd);
	let sessionsDir = join(homedir(), ".claude", "projects", projectDir);

	// 容错：如果目录不存在，尝试模糊匹配
	try {
		await stat(sessionsDir);
	} catch {
		const matchedDir = await findBestMatchingProjectDir(cwd);
		if (matchedDir) {
			projectDir = matchedDir;
			sessionsDir = join(homedir(), ".claude", "projects", projectDir);
		}
	}

	// 调试日志
	if (process.env.DEBUG_SESSION) {
		console.error(`[DEBUG] Original projectDir: ${cwdToProjectDir(cwd)}`);
		console.error(`[DEBUG] Matched projectDir: ${projectDir}`);
		console.error(`[DEBUG] sessionsDir: ${sessionsDir}`);
	}

	try {
		const files = await readdir(sessionsDir);
		const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

		// 调试日志
		if (process.env.DEBUG_SESSION) {
			console.error(`[DEBUG] found ${jsonlFiles.length} jsonl files`);
		}

		if (jsonlFiles.length === 0) return "";

		// 获取每个文件的创建时间、修改时间和大小（使用并发限制）
		const fileStats = await Promise.all(
			jsonlFiles.map((f) =>
				statLimit(async () => {
					const path = join(sessionsDir, f);
					const s = await stat(path);
					return {
						path,
						birthtime: s.birthtime,
						mtimeMs: s.mtimeMs,
						size: s.size,
					};
				}),
			),
		);

		// 调试日志
		if (process.env.DEBUG_SESSION) {
			console.error(`[DEBUG] total files: ${fileStats.length}`);
			for (const f of fileStats) {
				console.error(
					`[DEBUG]   ${f.path.split("/").pop()}: ${f.size} bytes, birth: ${f.birthtime.toISOString()}, mtime: ${new Date(f.mtimeMs).toISOString()}`,
				);
			}
			if (startTime) {
				console.error(`[DEBUG] startTime: ${startTime.toISOString()}`);
			}
		}

		// 如果提供了启动时间，使用新的评分算法
		if (startTime && fileStats.length > 0) {
			const startMs = startTime.getTime();

			// 快速过滤：排除明显不符合的文件
			const candidates = fileStats.filter((f) => {
				// 过滤掉太小的文件（可能是空会话）
				if (f.size < 1024) return false;
				// 过滤掉创建时间远早于进程启动的文件（超过1天）
				const birthDiff = f.birthtime.getTime() - startMs;
				if (birthDiff < -86400000) return false; // 1天 = 86400000ms
				return true;
			});

			if (candidates.length === 0) {
				// 没有候选文件，返回空
				if (process.env.DEBUG_SESSION) {
					console.error("[DEBUG] no valid candidates after filtering");
				}
				return "";
			}

			// 获取所有候选文件的元数据并计算得分
			const scored = await Promise.all(
				candidates.map(async (file) => {
					const metadata = await metadataCache.get(file.path);
					const score = calculateConfidenceScore(file, metadata, startMs);
					return { file, metadata, score };
				}),
			);

			// 按得分排序
			scored.sort((a, b) => b.score - a.score);

			// 调试日志
			if (process.env.DEBUG_SESSION) {
				console.error("[DEBUG] Scored candidates:");
				for (const { file, score, metadata } of scored) {
					console.error(
						`  ${file.path.split("/").pop()}: score=${score}, messages=${metadata.messageCount}`,
					);
				}
			}

			// 选择得分最高的文件
			const best = scored[0];
			const confidenceThreshold = 30; // 置信度阈值（降低以支持更多场景）

			if (best && best.score >= confidenceThreshold) {
				if (process.env.DEBUG_SESSION) {
					console.error(
						`[DEBUG] matched with score ${best.score}: ${best.file.path}`,
					);
				}
				return best.file.path;
			}

			// 得分太低，不匹配
			if (process.env.DEBUG_SESSION) {
				console.error(
					`[DEBUG] best score ${best?.score || 0} < ${confidenceThreshold}, no match`,
				);
			}
			return "";
		}

		// 没有提供启动时间，回退到最新修改的文件
		fileStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
		if (process.env.DEBUG_SESSION && fileStats[0]) {
			console.error(`[DEBUG] fallback to latest: ${fileStats[0].path}`);
		}
		return fileStats[0]?.path || "";
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
 * 增量读取会话文件中的新消息
 * @param sessionPath 会话文件路径
 * @param fromLine 起始行号（从 0 开始）
 * @returns 新消息数组和当前总行数
 */
export async function getNewMessages(
	sessionPath: string,
	fromLine: number,
): Promise<{ messages: SessionMessage[]; totalLines: number }> {
	if (!sessionPath) return { messages: [], totalLines: 0 };

	try {
		// 使用缓存读取文件内容
		const content = await sessionContentCache.get(sessionPath);
		const lines = content.trim().split("\n");
		const totalLines = lines.length;

		// 只处理新增的行
		const newLines = lines.slice(fromLine);
		const messages: SessionMessage[] = [];

		for (const line of newLines) {
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

		return { messages, totalLines };
	} catch {
		return { messages: [], totalLines: 0 };
	}
}

/**
 * 读取会话文件中的所有消息（限制最大数量）
 * @param sessionPath 会话文件路径
 * @returns 包含消息数组和总行数的对象
 */
export async function getAllMessages(
	sessionPath: string,
): Promise<{ messages: SessionMessage[]; lineCount: number }> {
	if (!sessionPath) return { messages: [], lineCount: 0 };

	try {
		// 使用缓存读取文件内容
		const content = await sessionContentCache.get(sessionPath);
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

		return { messages, lineCount: lines.length };
	} catch {
		return { messages: [], lineCount: 0 };
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

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的大小字符串
 */
function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 格式化时间差
 * @param date 日期对象
 * @param referenceDate 参考日期
 * @returns 格式化后的时间差字符串
 */
function formatTimeDiff(date: Date, referenceDate: Date): string {
	const diffMs = date.getTime() - referenceDate.getTime();
	const diffSec = Math.abs(diffMs / 1000);

	if (diffSec < 60) {
		return diffMs >= 0
			? `启动后 ${diffSec.toFixed(0)} 秒`
			: `启动前 ${diffSec.toFixed(0)} 秒`;
	}

	const diffMin = diffSec / 60;
	return diffMs >= 0
		? `启动后 ${diffMin.toFixed(1)} 分钟`
		: `启动前 ${diffMin.toFixed(1)} 分钟`;
}

/**
 * 清除指定会话文件的缓存
 * @param sessionPath 会话文件路径
 */
export function clearSessionCache(sessionPath: string): void {
	sessionContentCache.clear(sessionPath);
}

/**
 * 清除所有会话缓存
 */
export function clearAllSessionCache(): void {
	sessionContentCache.clearAll();
}

/**
 * 获取项目目录下的所有会话文件
 * @param cwd 工作目录
 * @returns 会话文件数组，按修改时间倒序排列
 */
export async function getAllSessionFiles(cwd: string): Promise<SessionFile[]> {
	let projectDir = cwdToProjectDir(cwd);
	let sessionsDir = join(homedir(), ".claude", "projects", projectDir);

	// 容错：如果目录不存在，尝试模糊匹配
	try {
		await stat(sessionsDir);
	} catch {
		const matchedDir = await findBestMatchingProjectDir(cwd);
		if (matchedDir) {
			projectDir = matchedDir;
			sessionsDir = join(homedir(), ".claude", "projects", projectDir);
		} else {
			return [];
		}
	}

	try {
		const files = await readdir(sessionsDir);
		const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

		if (jsonlFiles.length === 0) return [];

		// 并发获取所有文件的信息
		const sessionFiles = await Promise.all(
			jsonlFiles.map((fileName) =>
				statLimit(async () => {
					const filePath = join(sessionsDir, fileName);
					const fileStat = await stat(filePath);
					const metadata = await metadataCache.get(filePath);
					const recentMessages = await getRecentMessages(filePath, 5);

					return {
						fileName,
						filePath,
						size: fileStat.size,
						birthtime: fileStat.birthtime,
						mtime: new Date(fileStat.mtimeMs),
						messageCount: metadata.messageCount,
						lastMessageTime: metadata.lastMessageTime
							? new Date(metadata.lastMessageTime)
							: null,
						recentMessages,
					};
				}),
			),
		);

		// 按修改时间倒序排列
		sessionFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

		return sessionFiles;
	} catch {
		return [];
	}
}

/**
 * 调试会话匹配逻辑，输出详细的匹配信息
 * @param processes Claude 进程列表
 * @returns 格式化的调试信息字符串
 */
export async function debugSessionMatching(
	processes: Array<{ pid: number; cwd: string; startTime: Date }>,
): Promise<string> {
	const output: string[] = [];
	output.push("=== Claude Code 会话调试信息 ===\n");

	if (processes.length === 0) {
		output.push("未找到运行中的 Claude Code 进程\n");
		return output.join("\n");
	}

	let successCount = 0;

	for (let i = 0; i < processes.length; i++) {
		const proc = processes[i];
		output.push(`进程 #${i + 1} (PID: ${proc.pid})`);
		output.push(`  工作目录: ${proc.cwd}`);
		output.push(`  启动时间: ${proc.startTime.toISOString()}`);

		const projectDir = cwdToProjectDir(proc.cwd);
		const sessionsDir = join(homedir(), ".claude", "projects", projectDir);
		output.push(`  项目目录: ${projectDir}`);
		output.push(`  会话目录: ${sessionsDir}`);
		output.push("");

		try {
			const files = await readdir(sessionsDir);
			const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

			if (jsonlFiles.length === 0) {
				output.push("  ⚠️  未找到会话文件");
				output.push("");
				continue;
			}

			output.push("  找到的会话文件:");
			const fileStats = await Promise.all(
				jsonlFiles.map((f) =>
					statLimit(async () => {
						const path = join(sessionsDir, f);
						const s = await stat(path);
						return {
							name: f,
							path,
							birthtime: s.birthtime,
							mtime: new Date(s.mtimeMs),
							size: s.size,
						};
					}),
				),
			);

			// 显示所有文件信息
			for (const file of fileStats) {
				const ignored = file.size < 1024;
				const prefix = ignored ? "    ✗" : "    ✓";
				output.push(`${prefix} ${file.name}`);
				output.push(`      大小: ${formatSize(file.size)}`);
				if (ignored) {
					output.push("      (< 1KB, 已忽略)");
				}
				output.push(
					`      创建: ${file.birthtime.toISOString()} (${formatTimeDiff(file.birthtime, proc.startTime)})`,
				);
				output.push(
					`      修改: ${file.mtime.toISOString()} (${formatTimeDiff(file.mtime, proc.startTime)})`,
				);
				output.push("");
			}

			// 执行匹配逻辑
			const startMs = proc.startTime.getTime();
			const validFiles = fileStats.filter((f) => f.size >= 1024);

			let matchedFile: (typeof fileStats)[0] | null = null;
			let matchStrategy = "";

			// 策略1: 创建时间匹配
			const birthtimeThreshold = 300000; // 5 分钟
			const birthtimeMatched = validFiles
				.filter(
					(f) => Math.abs(f.birthtime.getTime() - startMs) < birthtimeThreshold,
				)
				.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

			if (birthtimeMatched.length > 0) {
				matchedFile = birthtimeMatched[0];
				matchStrategy = "创建时间匹配 ✓";
			} else {
				// 策略2: 修改时间匹配
				const mtimeThreshold = 600000; // 10 分钟
				const mtimeMatched = validFiles
					.filter((f) => {
						const mtimeDiff = f.mtime.getTime() - startMs;
						return Math.abs(mtimeDiff) < mtimeThreshold;
					})
					.sort(
						(a, b) =>
							Math.abs(a.mtime.getTime() - startMs) -
							Math.abs(b.mtime.getTime() - startMs),
					);

				if (mtimeMatched.length > 0) {
					matchedFile = mtimeMatched[0];
					matchStrategy = "修改时间匹配 ✓";
				} else {
					// 策略3: 回退到最新文件
					const sorted = [...validFiles].sort(
						(a, b) => b.mtime.getTime() - a.mtime.getTime(),
					);
					if (sorted.length > 0) {
						matchedFile = sorted[0];
						matchStrategy = "回退到最新文件";
					}
				}
			}

			// 显示匹配结果
			output.push("  匹配结果:");
			output.push(`    策略: ${matchStrategy}`);

			if (matchedFile) {
				output.push(`    选择: ${matchedFile.name}`);

				// 读取消息数量
				try {
					const { messages } = await getAllMessages(matchedFile.path);
					output.push(`    消息数: ${messages.length} 条`);
					successCount++;
				} catch {
					output.push("    消息数: 读取失败");
				}
			} else {
				output.push("    选择: 无");
			}

			output.push("");
			output.push("---");
			output.push("");
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			output.push(`  ❌ 错误: ${errorMsg}`);
			output.push("");
			output.push("---");
			output.push("");
		}
	}

	output.push(
		`总计: ${processes.length} 个进程, ${successCount} 个成功匹配会话`,
	);

	return output.join("\n");
}
