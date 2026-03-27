import { basename } from "node:path";
import chalk from "chalk";
import { t } from "../i18n/index.js";
import { ProcessService } from "../services/ProcessService.js";
import type { SessionData } from "../services/ProcessService.js";
import { formatDate, renderMessage, renderStats } from "../utils/display.js";
import { handleOutput } from "../utils/output.js";
import type { OutputMode } from "../utils/output.js";

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
async function displaySessionData(
	sessionData: SessionData,
	source: { pid?: number; sourceType: "running" | "history" },
	options: SessionOptions,
): Promise<void> {
	const { messages, stats, session } = sessionData;

	// Determine output mode
	let mode: OutputMode = "terminal";
	if (options.md) {
		mode = "md";
	} else if (options.save) {
		mode = "save";
	} else if (options.copy) {
		mode = "copy";
	}

	const service = new ProcessService();

	// Generate markdown for non-terminal modes
	const markdown =
		mode !== "terminal" ? service.generateMarkdown(sessionData) : "";

	// Handle output
	await handleOutput(sessionData, markdown, mode, {
		filePath: typeof options.save === "string" ? options.save : undefined,
		defaultFileName: `ccpeek_session_${source.pid ?? session.sessionId}`,
		displayFn: (data) => {
			// Terminal output
			const sourceLabel =
				source.sourceType === "running"
					? chalk.gray(
							t("session.display.sourceRunning", { pid: source.pid ?? "" }),
						)
					: chalk.gray(t("session.display.sourceHistory"));

			console.log(
				chalk.bold.cyan(
					t("session.display.sessionTitle", {
						summary: data.session.summary,
						source: sourceLabel,
					}),
				),
			);

			// Statistics
			renderStats(data.stats, "session");

			console.log(
				chalk.bold(
					t("session.display.history", { count: data.messages.length }),
				),
			);

			// Message history
			for (const msg of data.messages) {
				renderMessage(msg);
			}
		},
		namespace: "session",
	});
}

/**
 * Show history sessions list
 */
function showHistorySessions(
	projectPath: string,
	sessions: ReturnType<ProcessService["getHistorySessions"]>,
): void {
	if (!sessions || sessions.length === 0) {
		console.log(chalk.yellow(t("session.errors.noHistorySessions")));
		return;
	}

	console.log(
		chalk.bold(
			t("session.display.historyTitle", { project: basename(projectPath) }),
		),
	);
	for (let i = 0; i < sessions.length; i++) {
		const s = sessions[i];
		const num = chalk.cyan((i + 1).toString().padStart(2, " "));
		const modified = chalk.gray(formatDate(s.modified));
		const summary = s.summary;
		console.log(`  ${num} ${modified} - ${summary}`);
	}
	console.log();
}

export async function sessionCommand(
	input?: string,
	options: SessionCommandOptions = {},
): Promise<void> {
	const { sessionId, ...outputOptions } = options;

	// Ensure at most one output option is used
	const outputModes = [
		outputOptions.md && "md",
		outputOptions.save && "save",
		outputOptions.copy && "copy",
	].filter(Boolean);

	if (outputModes.length > 1) {
		console.log(chalk.red(t("session.errors.multipleOutputModes")));
		return;
	}

	const service = new ProcessService();

	// If sessionId is provided, directly search history sessions
	if (input && sessionId) {
		const historySessions = service.getHistorySessions(input);
		if (!historySessions) {
			console.log(
				chalk.red(t("session.errors.projectNotFound", { path: input })),
			);
			return;
		}
		if (historySessions.length === 0) {
			console.log(chalk.yellow(t("session.errors.noHistorySessions")));
			return;
		}
		// Find by exact match or prefix
		const matched = historySessions.find(
			(s) => s.id === sessionId || s.id.startsWith(sessionId),
		);
		if (matched) {
			const sessionData = service.getHistorySessionData(input, matched.id);
			if (sessionData) {
				await displaySessionData(
					sessionData,
					{ sourceType: "history" },
					outputOptions,
				);
			}
			return;
		}
		console.log(chalk.red(t("session.errors.sessionNotFound", { sessionId })));
		showHistorySessions(input, historySessions);
		return;
	}

	// 1. Try running processes first
	const runningResult = service.selectProcess(input);
	if ("process" in runningResult) {
		const sessionData = service.getSessionData(runningResult.process);
		if (!sessionData) {
			console.log(chalk.yellow(t("session.errors.noSessionInfo")));
			return;
		}
		await displaySessionData(
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
			console.log(
				chalk.red(t("session.errors.projectNotFound", { path: input })),
			);
			return;
		}

		if (historySessions.length === 0) {
			console.log(chalk.yellow(t("session.errors.noHistorySessions")));
			return;
		}

		// No sessionId provided, use the latest (first in sorted list)
		const latest = historySessions[0];
		const sessionData = service.getHistorySessionData(input, latest.id);
		if (sessionData) {
			await displaySessionData(
				sessionData,
				{ sourceType: "history" },
				outputOptions,
			);
		}
		return;
	}

	// 3. Handle error cases from running processes
	if (runningResult.error === "NO_PROCESSES") {
		console.log(chalk.yellow(t("session.errors.noRunningProcesses")));
	} else if (runningResult.error === "PID_NOT_FOUND") {
		console.log(
			chalk.red(
				t("session.errors.processNotFound", { input: runningResult.pid }),
			),
		);
	} else if (runningResult.error === "MULTIPLE_PROCESSES") {
		console.log(chalk.yellow(t("session.errors.multipleProcesses")));
		for (const p of runningResult.processes) {
			console.log(`  ${p.pid} - ${p.cwd}`);
		}
	}
}
