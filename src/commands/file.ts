import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import chalk from "chalk";
import { t } from "../i18n/index.js";
import { ProcessService } from "../services/ProcessService.js";
import type { SessionData } from "../services/ProcessService.js";
import { renderMessage, renderStats } from "../utils/display.js";
import { handleOutput } from "../utils/output.js";
import type { OutputMode } from "../utils/output.js";

// Constants
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
	renderStats(stats, "file");

	console.log(
		chalk.bold(t("file.display.history", { count: messages.length })),
	);

	// Message history
	for (const msg of messages) {
		renderMessage(msg);
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
	let mode: OutputMode = "terminal";
	if (options.md) {
		mode = "md";
	} else if (options.save) {
		mode = "save";
	} else if (options.copy) {
		mode = "copy";
	}

	// Generate markdown for non-terminal modes
	const markdown =
		mode !== "terminal" ? service.generateMarkdown(filteredData) : "";

	// Handle output
	await handleOutput(filteredData, markdown, mode, {
		filePath: typeof options.save === "string" ? options.save : undefined,
		defaultFileName: "ccpeek_file",
		displayFn: (data) => displayFileSession(data, resolvedPath),
		namespace: "file",
	});
}
