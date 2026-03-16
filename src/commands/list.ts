import chalk from "chalk";
import { padEndByWidth, truncateAndPad } from "../lib/format.js";
import { ProcessService } from "../services/ProcessService.js";

export function listCommand(options: { json?: boolean }) {
	const service = new ProcessService();
	const processes = service.getAllProcesses();

	if (options.json) {
		console.log(JSON.stringify(processes, null, 2));
		return;
	}

	if (processes.length === 0) {
		console.log(chalk.yellow("未找到运行中的 Claude Code 进程"));
		return;
	}

	console.log(chalk.bold("\nClaude Code 进程:\n"));

	// 表头
	console.log(
		chalk.cyan(
			`${padEndByWidth("PID", 8)}${padEndByWidth("CPU", 8)}${padEndByWidth("MEM", 8)}${padEndByWidth("进程运行", 12)}${padEndByWidth("项目名", 20)}会话`,
		),
	);
	console.log(chalk.gray("─".repeat(80)));

	// 进程列表
	for (const proc of processes) {
		const summary = (proc.session?.summary || "N/A").replace(/\s+/g, " ");
		const truncated = truncateAndPad(summary, 40).trimEnd();
		console.log(
			`${padEndByWidth(String(proc.pid), 8)}${padEndByWidth(proc.cpu, 8)}${padEndByWidth(proc.mem, 8)}${padEndByWidth(proc.etime, 12)}${padEndByWidth(proc.projectName, 20)}${chalk.dim(truncated)}`,
		);
	}

	console.log(chalk.gray(`\n${"─".repeat(80)}`));
	console.log(chalk.green(`\n总计: ${processes.length} 个进程\n`));
}
