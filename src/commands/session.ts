import chalk from "chalk";
import { ProcessService } from "../services/ProcessService.js";

function formatTime(isoString: string): string {
	return new Date(isoString).toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
}

function formatDuration(start: string, end: string): string {
	const duration = new Date(end).getTime() - new Date(start).getTime();
	const minutes = Math.floor(duration / 60000);
	const seconds = Math.floor((duration % 60000) / 1000);
	return `${minutes} 分 ${seconds} 秒`;
}

export function sessionCommand(pid?: string) {
	const service = new ProcessService();
	const result = service.selectProcess(pid);

	if ("error" in result) {
		if (result.error === "NO_PROCESSES") {
			console.log(chalk.yellow("未找到运行中的 Claude Code 进程"));
		} else if (result.error === "PID_NOT_FOUND") {
			console.log(chalk.red(`未找到匹配 "${result.pid}" 的进程`));
		} else if (result.error === "MULTIPLE_PROCESSES") {
			console.log(chalk.yellow("存在多个进程，请指定 PID 或路径:"));
			for (const p of result.processes) {
				console.log(`  ${p.pid} - ${p.cwd}`);
			}
		}
		return;
	}

	const sessionData = service.getSessionData(result.process);
	if (!sessionData) {
		console.log(chalk.yellow("该进程没有会话信息"));
		return;
	}

	const { messages, stats, session } = sessionData;

	console.log(chalk.bold.cyan(`\n会话对话 - ${session.summary}\n`));

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
