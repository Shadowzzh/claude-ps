import chalk from "chalk";
import { t } from "../i18n/index.js";
import type { SessionData } from "../services/ProcessService.js";

// Constants for preview limits
const MAX_THINKING_PREVIEW = 100;
const MAX_TOOL_RESULT_PREVIEW = 200;
const MAX_TOOL_PARAMS_PREVIEW = 100;

/**
 * Format ISO timestamp to time string
 */
export function formatTime(isoString: string): string {
	return new Date(isoString).toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
}

/**
 * Format ISO timestamp to date string
 */
export function formatDate(isoString: string): string {
	return new Date(isoString).toLocaleString(undefined, {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

/**
 * Calculate duration between two timestamps
 */
export function calculateDuration(
	start: string,
	end: string,
): { minutes: number; seconds: number } {
	const duration = new Date(end).getTime() - new Date(start).getTime();
	return {
		minutes: Math.floor(duration / 60000),
		seconds: Math.floor((duration % 60000) / 1000),
	};
}

/**
 * Get message role label and color
 */
function getMessageRole(msg: {
	type: string;
	message?: { content?: unknown };
}): { label: string; color: typeof chalk } {
	const isToolResult =
		Array.isArray(msg.message?.content) &&
		msg.message.content.some(
			(item: { type: string }) => item.type === "tool_result",
		);

	if (isToolResult) {
		return { label: "TOOL_RESULT", color: chalk.magenta };
	}
	if (msg.type === "user") {
		return { label: "USER", color: chalk.green };
	}
	return { label: "AI", color: chalk.blue };
}

/**
 * Render content items (text, thinking, tool_use, tool_result)
 */
function renderContentItems(
	items: Array<{
		type: string;
		text?: string;
		thinking?: string;
		name?: string;
		input?: unknown;
		content?: unknown;
	}>,
): void {
	for (const item of items) {
		if (item.type === "text" && item.text) {
			console.log(item.text);
		} else if (item.type === "thinking" && item.thinking) {
			const preview = item.thinking.substring(0, MAX_THINKING_PREVIEW);
			const suffix = item.thinking.length > MAX_THINKING_PREVIEW ? "..." : "";
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
					: JSON.stringify(item.content).substring(0, MAX_TOOL_RESULT_PREVIEW);
			const suffix =
				resultContent.length >= MAX_TOOL_RESULT_PREVIEW ? "..." : "";
			console.log(chalk.gray(resultContent + suffix));
		}
	}
}

/**
 * Render a single message to console
 */
export function renderMessage(msg: {
	type: string;
	timestamp: string;
	message?: { content?: unknown };
}): void {
	const time = formatTime(msg.timestamp);
	const { label, color } = getMessageRole(msg);

	console.log(color(`[${label}] ${time}`));

	if (typeof msg.message?.content === "string") {
		console.log(msg.message.content);
	} else if (Array.isArray(msg.message?.content)) {
		renderContentItems(msg.message.content);
	}
	console.log();
}

/**
 * Render statistics to console
 */
export function renderStats(
	stats: {
		totalMessages: number;
		userMessages: number;
		assistantMessages: number;
		totalInputTokens: number;
		totalOutputTokens: number;
		startTime: string;
		endTime: string;
		thinkingCount: number;
		toolCalls: Record<string, number>;
	},
	namespace: "session" | "file",
): void {
	console.log(chalk.bold(t(`${namespace}.display.statistics`)));
	console.log(
		t(`${namespace}.display.messages`, {
			total: stats.totalMessages,
			user: stats.userMessages,
			ai: stats.assistantMessages,
		}),
	);
	console.log(
		t(`${namespace}.display.tokens`, {
			input: stats.totalInputTokens.toLocaleString(),
			output: stats.totalOutputTokens.toLocaleString(),
		}),
	);

	if (stats.startTime && stats.endTime) {
		const { minutes, seconds } = calculateDuration(
			stats.startTime,
			stats.endTime,
		);
		console.log(t(`${namespace}.display.duration`, { minutes, seconds }));
	}

	if (stats.thinkingCount > 0) {
		console.log(
			t(`${namespace}.display.thinking`, { count: stats.thinkingCount }),
		);
	}

	if (Object.keys(stats.toolCalls).length > 0) {
		const tools = Object.entries(stats.toolCalls)
			.map(([name, count]) => `${name}(${count})`)
			.join(", ");
		console.log(t(`${namespace}.display.tools`, { tools }));
	}
}
