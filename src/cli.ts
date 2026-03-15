import { createRequire } from "node:module";
import { Command } from "commander";
import { detailCommand } from "./commands/detail.js";
import { installCommand } from "./commands/install.js";
import { listCommand } from "./commands/list.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

export function createCli() {
	const program = new Command();

	program
		.name("claude-ps")
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
		.command("install")
		.description("安装 hook 脚本到 ~/.claude/hooks/claude-ps")
		.action(() => {
			installCommand();
		});

	program
		.command("detail [pid]")
		.description("查看进程详细信息")
		.action((pid) => {
			detailCommand(pid);
		});

	return program;
}
