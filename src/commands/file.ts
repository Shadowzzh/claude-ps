import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import chalk from "chalk";
import { t } from "../i18n/index.js";
import { ProcessService } from "../services/ProcessService.js";
import type { SessionData } from "../services/ProcessService.js";

// Constants
const MAX_THINKING_PREVIEW = 100;
const MAX_TOOL_RESULT_PREVIEW = 200;
const MAX_TOOL_PARAMS_PREVIEW = 100;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface FileOptions {
	md?: boolean;
	save?: string | boolean;
	copy?: boolean;
	userOnly?: boolean;
	aiOnly?: boolean;
	tools?: boolean;
	noThinking?: boolean;
}

/**
 * Display session data from file
 */
function displayFileSession(sessionData: SessionData, filePath: string): void {
	const { messages, stats } = sessionData;

	console.log(
		chalk.bold.cyan(
			t("file.display.sessionFile", { summary: sessionData.session.summary }),
		),
	);
	console.log(chalk.gray(t("file.display.filePath", { path: filePath })));

	// Statistics
	console.log(chalk.bold(t("file.display.statistics")));
	console.log(
		t("file.display.messages", {
			total: stats.totalMessages,
			user: stats.userMessages,
			ai: stats.assistantMessages,
		}),
	);
	console.log(
		t("file.display.tokens", {
			input: stats.totalInputTokens.toLocaleString(),
			output: stats.totalOutputTokens.toLocaleString(),
		}),
	);
	if (stats.startTime && stats.endTime) {
		const duration =
			new Date(stats.endTime).getTime() - new Date(stats.startTime).getTime();
		const minutes = Math.floor(duration / 60000);
		const seconds = Math.floor((duration % 60000) / 1000);
		console.log(t("file.display.duration", { minutes, seconds }));
	}
	if (stats.thinkingCount > 0) {
		console.log(t("file.display.thinking", { count: stats.thinkingCount }));
	}
	if (Object.keys(stats.toolCalls).length > 0) {
		console.log(
			t("file.display.tools", {
				tools: Object.entries(stats.toolCalls)
					.map(([name, count]) => `${name}(${count})`)
					.join(", "),
			}),
		);
	}

	console.log(
		chalk.bold(t("file.display.history", { count: messages.length })),
	);

	// Message history
	for (const msg of messages) {
		const time = new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});

		const isToolResult =
			Array.isArray(msg.message?.content) &&
			msg.message.content.some((item) => item.type === "tool_result");

		let roleLabel: string;
		let roleColor: typeof chalk;

		if (isToolResult) {
			roleLabel = "TOOL_RESULT";
			roleColor = chalk.magenta;
		} else if (msg.type === "user") {
			roleLabel = "USER";
			roleColor = chalk.green;
		} else {
			roleLabel = "AI";
			roleColor = chalk.blue;
		}

		console.log(roleColor(`[${roleLabel}] ${time}`));

		if (typeof msg.message?.content === "string") {
			console.log(msg.message.content);
		} else if (Array.isArray(msg.message?.content)) {
			for (const item of msg.message.content) {
				if (item.type === "text" && item.text) {
					console.log(item.text);
				} else if (item.type === "thinking" && item.thinking) {
					const preview = item.thinking.substring(0, MAX_THINKING_PREVIEW);
					const suffix =
						item.thinking.length > MAX_THINKING_PREVIEW ? "..." : "";
					console.log(chalk.yellow(`[THINKING] ${preview}${suffix}`));
				} else if (item.type === "tool_use" && item.name) {
					const params = item.input
						? ` ${JSON.stringify(item.input).substring(0, MAX_TOOL_PARAMS_PREVIEW)}`
						: "";
					console.log(chalk.cyan(`[TOOL] ${item.name}${params}`));
				} else if (item.type === "tool_result") {
					const resultContent =
						typeof item.content === "string"
							? item.content.substring(0, MAX_TOOL_RESULT_PREVIEW)
							: JSON.stringify(item.content).substring(
									0,
									MAX_TOOL_RESULT_PREVIEW,
								);
					const suffix =
						resultContent.length >= MAX_TOOL_RESULT_PREVIEW ? "..." : "";
					console.log(chalk.gray(resultContent + suffix));
				}
			}
		}
		console.log();
	}
}

export async function fileCommand(
	filePath?: string,
	options: FileOptions = {},
): Promise<void> {
	if (!filePath) {
		console.log(chalk.red(t("file.errors.noPath")));
		console.log(chalk.gray(t("file.errors.usage")));
		return;
	}

	// Ensure at most one output option is used
	const outputModes = [
		options.md && "md",
		options.save && "save",
		options.copy && "copy",
	].filter(Boolean);

	if (outputModes.length > 1) {
		console.log(chalk.red(t("file.errors.multipleOutputModes")));
		return;
	}

	// Resolve file path
	const resolvedPath = resolve(filePath);

	// Check file exists
	if (!existsSync(resolvedPath)) {
		console.log(
			chalk.red(t("file.errors.fileNotFound", { path: resolvedPath })),
		);
		return;
	}

	// Check file extension
	if (!resolvedPath.endsWith(".jsonl")) {
		console.log(chalk.red(t("file.errors.invalidFormat")));
		return;
	}

	// Check file size before parsing
	const fileStats = statSync(resolvedPath);
	if (fileStats.size > MAX_FILE_SIZE) {
		console.log(
			chalk.red(
				t("file.errors.fileTooLarge", {
					size: (fileStats.size / 1024 / 1024).toFixed(2),
					max: (MAX_FILE_SIZE / 1024 / 1024).toFixed(0),
				}),
			),
		);
		return;
	}

	// Parse file
	const service = new ProcessService();
	const sessionData = service.parseJsonlFile(resolvedPath, MAX_FILE_SIZE);

	if (!sessionData) {
		console.log(chalk.red(t("file.errors.parseError")));
		return;
	}

	// Apply filters
	const filteredData = {
		...sessionData,
		messages: service.filterMessages(sessionData.messages, options),
	};

	// Determine output mode
	let outputMode: string | null = null;
	if (options.md) {
		outputMode = "md";
	} else if (options.save) {
		outputMode = "save";
	} else if (options.copy) {
		outputMode = "copy";
	}

	if (outputMode) {
		const markdown = service.generateMarkdown(filteredData);

		if (outputMode === "md") {
			console.log(markdown);
			return;
		}

		if (outputMode === "save") {
			const saveFilePath =
				typeof options.save === "string"
					? options.save
					: `/tmp/ccpeek_file_${Date.now()}.md`;

			try {
				const dir = dirname(saveFilePath);
				if (dir && dir !== ".") {
					mkdirSync(dir, { recursive: true });
				}
				writeFileSync(saveFilePath, markdown, "utf-8");
				console.log(
					chalk.green(t("file.success.saved", { path: saveFilePath })),
				);
			} catch (err) {
				const error = err instanceof Error ? err : new Error(String(err));
				console.error(
					chalk.red(t("file.errors.saveFailed", { error: error.message })),
				);
				process.exit(1);
			}
			return;
		}

		if (outputMode === "copy") {
			const { default: clipboardy } = await import("clipboardy");
			try {
				await clipboardy.write(markdown);
				console.log(chalk.green(t("file.success.copied")));
			} catch (err) {
				const error = err instanceof Error ? err : new Error(String(err));
				console.error(
					chalk.red(t("file.errors.copyFailed", { error: error.message })),
				);
				process.exit(1);
			}
			return;
		}
	}

	// Default: terminal output
	displayFileSession(filteredData, resolvedPath);
}
