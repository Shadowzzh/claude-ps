import { existsSync, mkdirSync } from "node:fs";
import { basename } from "node:path";
import chalk from "chalk";
import clipboardy from "clipboardy";
import { ProcessService } from "../services/ProcessService.js";
import type { SessionData } from "../services/ProcessService.js";

function formatTime(isoString: string): string {
	return new Date(isoString).toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
}

function formatDate(isoString: string): string {
	return new Date(isoString).toLocaleString("zh-CN", {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

function formatDuration(start: string, end: string): string {
	const duration = new Date(end).getTime() - new Date(start).getTime();
	const minutes = Math.floor(duration / 60000);
	const seconds = Math.floor((duration % 60000) / 1000);
	return `${minutes} 分 ${seconds} 秒`;
}

interface SessionOptions {
	md?: boolean;
	save?: string | boolean;
	copy?: boolean;
}

interface SessionCommandOptions extends SessionOptions {
	sessionId?: string;
}

/**
 * Display session data (common logic for running and history sessions)
 */
function displaySessionData(
	sessionData: SessionData,
	source: { pid?: number; sourceType: "running" | "history" },
	options: SessionOptions,
): void {
	const { messages, stats, session, projectName } = sessionData;

	// Output modes: md, save, copy
	const outputMode = options.md
		? "md"
		: options.save
			? "save"
			: options.copy
				? "copy"
				: null;

	const service = new ProcessService();

	if (outputMode) {
		const markdown = service.generateMarkdown(sessionData);

		if (outputMode === "md") {
			console.log(markdown);
			return;
		}

		if (outputMode === "save") {
			const filePath =
				typeof options.save === "string"
					? options.save
					: `/tmp/ccpeek_session_${source.pid ?? session.sessionId}_${Date.now()}.md`;

			// Ensure parent directory exists
			const dir = filePath.substring(0, filePath.lastIndexOf("/"));
			if (dir && !existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}

			// Use dynamic import for fs/promises
			import("node:fs/promises").then(({ writeFile }) => {
				writeFile(filePath, markdown, "utf-8")
					.then(() => {
						console.log(chalk.green(`✓ 已保存到: ${filePath}`));
					})
					.catch((err) => {
						console.error(chalk.red(`保存失败: ${err.message}`));
					});
			});
			return;
		}

		if (outputMode === "copy") {
			clipboardy
				.write(markdown)
				.then(() => {
					console.log(chalk.green("✓ 已复制到剪贴板"));
				})
				.catch((err) => {
					console.error(chalk.red(`复制失败: ${err.message}`));
				});
			return;
		}
	}

	// Default: terminal output
	const sourceLabel =
		source.sourceType === "running"
			? chalk.gray(`[运行中 PID:${source.pid}]`)
			: chalk.gray("[历史会话]");
	console.log(
		chalk.bold.cyan(`\n会话对话 - ${session.summary} ${sourceLabel}\n`),
	);

	// 统计信息
	console.log(chalk.bold("统计信息:"));
	console.log(
		`  消息: ${stats.totalMessages} (用户: ${stats.userMessages}, AI: ${stats.assistantMessages})`,
	);
	console.log(
		`  Token: 输入 ${stats.totalInputTokens.toLocaleString()} / 输出 ${stats.totalOutputTokens.toLocaleString()}`,
	);
	if (stats.startTime && stats.endTime) {
		console.log(
			`  对话时长: ${formatDuration(stats.startTime, stats.endTime)}`,
		);
	}
	if (stats.thinkingCount > 0) {
		console.log(`  思考: ${stats.thinkingCount} 次`);
	}
	if (Object.keys(stats.toolCalls).length > 0) {
		console.log(
			`  工具: ${Object.entries(stats.toolCalls)
				.map(([name, count]) => `${name}(${count})`)
				.join(", ")}`,
		);
	}

	console.log(chalk.bold(`\n对话历史 (共 ${messages.length} 条):\n`));

	// 对话历史
	for (const msg of messages) {
		// 检查是否为工具结果消息
		const isToolResult =
			Array.isArray(msg.message?.content) &&
			msg.message.content.some((item) => item.type === "tool_result");

		const roleLabel = isToolResult
			? "TOOL_RESULT"
			: msg.type === "user"
				? "USER"
				: "AI";
		const roleColor = isToolResult
			? chalk.magenta
			: msg.type === "user"
				? chalk.green
				: chalk.blue;
		console.log(roleColor(`[${roleLabel}] ${formatTime(msg.timestamp)}`));

		if (typeof msg.message?.content === "string") {
			console.log(msg.message.content);
		} else if (Array.isArray(msg.message?.content)) {
			for (const item of msg.message.content) {
				if (item.type === "text" && item.text) {
					console.log(item.text);
				} else if (item.type === "thinking" && item.thinking) {
					console.log(
						chalk.yellow(
							`[THINKING] ${item.thinking.substring(0, 100)}${item.thinking.length > 100 ? "..." : ""}`,
						),
					);
				} else if (item.type === "tool_use" && item.name) {
					const params = item.input
						? ` ${JSON.stringify(item.input).substring(0, 100)}`
						: "";
					console.log(chalk.cyan(`[TOOL] ${item.name}${params}`));
				} else if (item.type === "tool_result") {
					const resultContent =
						typeof item.content === "string"
							? item.content.substring(0, 200)
							: JSON.stringify(item.content).substring(0, 200);
					console.log(
						chalk.gray(
							resultContent + (resultContent.length >= 200 ? "..." : ""),
						),
					);
				}
			}
		}
		console.log();
	}
}

/**
 * Show history sessions list
 */
function showHistorySessions(
	projectPath: string,
	sessions: ReturnType<ProcessService["getHistorySessions"]>,
): void {
	if (!sessions || sessions.length === 0) {
		console.log(chalk.yellow("该项目没有历史会话"));
		return;
	}

	console.log(chalk.bold(`\n历史会话 - ${basename(projectPath)}\n`));
	for (let i = 0; i < sessions.length; i++) {
		const s = sessions[i];
		const num = chalk.cyan((i + 1).toString().padStart(2, " "));
		const modified = chalk.gray(formatDate(s.modified));
		const summary = s.summary;
		console.log(`  ${num} ${modified} - ${summary}`);
	}
	console.log();
}

export function sessionCommand(
	input?: string,
	options: SessionCommandOptions = {},
): void {
	const { sessionId, ...outputOptions } = options;

	// Ensure at most one output option is used
	const outputModes = [
		outputOptions.md && "md",
		outputOptions.save && "save",
		outputOptions.copy && "copy",
	].filter(Boolean);

	if (outputModes.length > 1) {
		console.log(chalk.red("错误: --md, --save, --copy 不能同时使用"));
		return;
	}

	const service = new ProcessService();

	// 1. Try running processes first
	const runningResult = service.selectProcess(input);
	if ("process" in runningResult) {
		const sessionData = service.getSessionData(runningResult.process);
		if (!sessionData) {
			console.log(chalk.yellow("该进程没有会话信息"));
			return;
		}
		displaySessionData(
			sessionData,
			{ pid: runningResult.process.pid, sourceType: "running" },
			outputOptions,
		);
		return;
	}

	// 2. If input is provided, try history sessions
	if (input) {
		const historySessions = service.getHistorySessions(input);

		if (!historySessions) {
			console.log(chalk.red(`项目路径 "${input}" 不存在`));
			return;
		}

		if (historySessions.length === 0) {
			console.log(chalk.yellow("该项目没有历史会话"));
			return;
		}

		// If sessionId is provided, use it
		if (sessionId) {
			// Find by exact match or prefix
			const matched = historySessions.find(
				(s) => s.id === sessionId || s.id.startsWith(sessionId),
			);
			if (matched) {
				const sessionData = service.getHistorySessionData(input, matched.id);
				if (sessionData) {
					displaySessionData(
						sessionData,
						{ sourceType: "history" },
						outputOptions,
					);
				}
				return;
			}
			console.log(chalk.red(`未找到会话 ID "${sessionId}"`));
			showHistorySessions(input, historySessions);
			return;
		}

		// No sessionId provided, use the latest (first in sorted list)
		const latest = historySessions[0];
		const sessionData = service.getHistorySessionData(input, latest.id);
		if (sessionData) {
			displaySessionData(sessionData, { sourceType: "history" }, outputOptions);
		}
		return;
	}

	// 3. Handle error cases from running processes
	if (runningResult.error === "NO_PROCESSES") {
		console.log(chalk.yellow("未找到运行中的 Claude Code 进程"));
	} else if (runningResult.error === "PID_NOT_FOUND") {
		console.log(chalk.red(`未找到匹配 "${runningResult.pid}" 的进程`));
	} else if (runningResult.error === "MULTIPLE_PROCESSES") {
		console.log(chalk.yellow("存在多个进程，请指定 PID 或路径:"));
		for (const p of runningResult.processes) {
			console.log(`  ${p.pid} - ${p.cwd}`);
		}
	}
}
