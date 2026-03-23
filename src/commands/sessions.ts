import { basename } from "node:path";
import chalk from "chalk";
import { ProcessService } from "../services/ProcessService.js";

function formatDate(isoString: string): string {
	return new Date(isoString).toLocaleString("zh-CN", {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

/**
 * List all history sessions for a project
 */
export function sessionsCommand(projectPath: string): void {
	const service = new ProcessService();
	const sessions = service.getHistorySessions(projectPath);

	if (!sessions) {
		console.log(chalk.red(`项目路径 "${projectPath}" 不存在`));
		return;
	}

	if (sessions.length === 0) {
		console.log(chalk.yellow("该项目没有历史会话"));
		return;
	}

	console.log(chalk.bold(`\n历史会话 - ${basename(projectPath)}\n`));

	// Filter out sessions with 0 messages
	const validSessions = sessions.filter((s) => s.messageCount > 0);

	for (let i = 0; i < validSessions.length; i++) {
		const s = validSessions[i];
		const num = chalk.cyan((i + 1).toString().padStart(2, "0"));
		const date = chalk.gray(formatDate(s.modified));
		const summary =
			s.summary.length > 40 ? `${s.summary.slice(0, 40)}...` : s.summary;
		const count = chalk.gray(`(${s.messageCount}条)`);
		const id = chalk.dim(`[${s.id.slice(0, 8)}]`);
		console.log(`  ${num} ${date}  ${summary}  ${count} ${id}`);
	}

	console.log(chalk.dim(`\n  总计: ${validSessions.length} 个会话\n`));
	console.log(chalk.gray("  使用方法: ccpeek messages <path> <sessionId>\n"));
}
