import { createRequire } from "node:module";
import { Command } from "commander";
import { detailCommand } from "./commands/detail.js";
import { installCommand } from "./commands/install.js";
import { killCommand } from "./commands/kill.js";
import { listCommand } from "./commands/list.js";
import { sessionCommand } from "./commands/session.js";
import { sessionsCommand } from "./commands/sessions.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

export function createCli() {
	const program = new Command();

	program
		.name("ccpeek")
		.description(
			"TUI application for viewing and managing Claude Code processes",
		)
		.version(version);

	program
		.command("list")
		.description("列出所有 Claude Code 进程")
		.option("--json", "以 JSON 格式输出")
		.action((options) => {
			listCommand(options);
		});

	program
		.command("show [pid]")
		.description("查看进程详细信息")
		.action((pid) => {
			detailCommand(pid);
		});

	program
		.command("messages <pid-or-path> [sessionId]")
		.description("查看会话对话详情 (支持 PID、项目路径或项目路径+历史会话ID)")
		.option("--md", "以 Markdown 格式输出到 stdout")
		.option("--save [file]", "保存为 Markdown 文件")
		.option("--copy", "复制 Markdown 到剪贴板")
		.action((input, sessionId, options) => {
			sessionCommand(input, { ...options, sessionId });
		});

	program
		.command("sessions <project-path>")
		.description("列出项目的所有历史会话")
		.action((projectPath) => {
			sessionsCommand(projectPath);
		});

	program
		.command("kill [pid]")
		.description("终止进程")
		.action((pid) => {
			killCommand(pid);
		});

	program
		.command("setup")
		.description("安装 hook 脚本到 ~/.claude/hooks/ccpeek")
		.action(() => {
			installCommand();
		});

	return program;
}
