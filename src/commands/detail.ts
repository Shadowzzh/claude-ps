import chalk from "chalk";
import { ProcessService } from "../services/ProcessService.js";
import type { ProcessInfo } from "../types.js";

export function detailCommand(pid?: string) {
	const service = new ProcessService();

	if (pid) {
		const result = service.selectProcess(pid);
		if ("error" in result) {
			if (result.error === "NO_PROCESSES") {
				console.log(chalk.yellow("未找到运行中的 Claude Code 进程"));
			} else if (result.error === "PID_NOT_FOUND") {
				console.log(chalk.red(`未找到 PID 为 ${result.pid} 的进程`));
			}
			return;
		}
		printProcessDetail(result.process);
		return;
	}

	const processes = service.getAllProcesses();
	if (processes.length === 0) {
		console.log(chalk.yellow("未找到运行中的 Claude Code 进程"));
		return;
	}

	for (const proc of processes) {
		printProcessDetail(proc);
		if (processes.indexOf(proc) < processes.length - 1) {
			console.log(chalk.gray(`\n${"─".repeat(80)}\n`));
		}
	}
}

function printProcessDetail(proc: ProcessInfo) {
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
