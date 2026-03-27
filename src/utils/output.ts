import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import chalk from "chalk";
import { t } from "../i18n/index.js";
import type { SessionData } from "../services/ProcessService.js";

export type OutputMode = "terminal" | "md" | "save" | "copy";

export interface OutputOptions {
	/** File path for save mode */
	filePath?: string;
	/** Default file name prefix for save mode */
	defaultFileName?: string;
	/** Display function for terminal mode */
	displayFn?: (data: SessionData) => void;
	/** i18n namespace for messages */
	namespace: "session" | "file";
}

/**
 * Handle output in different modes (terminal/md/save/copy)
 */
export async function handleOutput(
	sessionData: SessionData,
	markdown: string,
	mode: OutputMode,
	options: OutputOptions,
): Promise<void> {
	const { namespace } = options;

	if (mode === "terminal") {
		options.displayFn?.(sessionData);
		return;
	}

	if (mode === "md") {
		console.log(markdown);
		return;
	}

	if (mode === "save") {
		const saveFilePath =
			options.filePath ||
			`/tmp/${options.defaultFileName || "ccpeek"}_${Date.now()}.md`;

		try {
			const dir = dirname(saveFilePath);
			if (dir && dir !== ".") {
				mkdirSync(dir, { recursive: true });
			}
			writeFileSync(saveFilePath, markdown, "utf-8");
			console.log(
				chalk.green(t(`${namespace}.success.saved`, { path: saveFilePath })),
			);
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			console.error(
				chalk.red(
					t(`${namespace}.errors.saveFailed`, { error: error.message }),
				),
			);
			throw error;
		}
		return;
	}

	if (mode === "copy") {
		const { default: clipboardy } = await import("clipboardy");
		try {
			await clipboardy.write(markdown);
			console.log(chalk.green(t(`${namespace}.success.copied`)));
		} catch (err) {
			const error = err instanceof Error ? err : new Error(String(err));
			console.error(
				chalk.red(
					t(`${namespace}.errors.copyFailed`, { error: error.message }),
				),
			);
			throw error;
		}
		return;
	}
}
