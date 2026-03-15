import chalk from "chalk";
import { getClaudeProcesses } from "../lib/process.js";

export function detailCommand(pid?: string) {
	const processes = getClaudeProcesses();

	if (processes.length === 0) {
		console.log(chalk.yellow("未找到运行中的 Claude Code 进程"));
		return;
	}

	// If PID provided, show only that process
	if (pid) {
		const proc = processes.find((p) => String(p.pid) === pid);
		if (!proc) {
			console.log(chalk.red(`未找到 PID 为 ${pid} 的进程`));
			return;
		}
		printProcessDetail(proc);
		return;
	}

	// Show all processes
	for (const proc of processes) {
		printProcessDetail(proc);
		if (processes.indexOf(proc) < processes.length - 1) {
			console.log(chalk.gray(`\n${"─".repeat(80)}\n`));
		}
	}
}

function printProcessDetail(proc: ReturnType<typeof getClaudeProcesses>[0]) {
	console.log(chalk.bold.cyan("\n进程详情"));
	console.log();
	console.log(`${chalk.bold("PID:")} ${proc.pid}`);
	console.log(`${chalk.bold("CPU:")} ${proc.cpu}`);
	console.log(`${chalk.bold("内存:")} ${proc.mem}`);
	console.log(`${chalk.bold("运行时长:")} ${proc.etime}`);
	console.log(`${chalk.bold("项目名:")} ${proc.projectName}`);
	console.log(`${chalk.bold("完整路径:")} ${proc.cwd}`);

	console.log();
	console.log(chalk.bold.cyan("会话信息"));
	console.log();

	if (proc.session) {
		console.log(`${chalk.bold("会话名称:")} ${proc.session.summary}`);
		console.log(`${chalk.bold("消息数:")} ${proc.session.messageCount}`);
		console.log(
			`${chalk.bold("创建时间:")} ${new Date(proc.session.created).toLocaleString()}`,
		);
		console.log(
			`${chalk.bold("修改时间:")} ${new Date(proc.session.modified).toLocaleString()}`,
		);
	} else {
		console.log(chalk.yellow("未找到会话信息"));
	}
	console.log();
}
