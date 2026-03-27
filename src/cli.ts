import { createRequire } from "node:module";
import { Command } from "commander";
import { configCommand } from "./commands/config.js";
import { detailCommand } from "./commands/detail.js";
import { fileCommand } from "./commands/file.js";
import { installCommand } from "./commands/install.js";
import { killCommand } from "./commands/kill.js";
import { listCommand } from "./commands/list.js";
import { sessionCommand } from "./commands/session.js";
import { sessionsCommand } from "./commands/sessions.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { t } from "./i18n/index.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

export function createCli() {
	const program = new Command();

	program
		.name("ccpeek")
		.description(t("cli.description"))
		.version(version)
		.option("--lang <lang>", "Language (zh/en)");

	program
		.command("list")
		.description(t("cli.commands.list"))
		.option("--json", t("cli.options.json"))
		.action((options) => {
			listCommand(options);
		});

	program
		.command("show [pid]")
		.description(t("cli.commands.show"))
		.action((pid) => {
			detailCommand(pid);
		});

	program
		.command("messages <pid-or-path> [sessionId]")
		.description(t("cli.commands.messages"))
		.option("--md", t("cli.options.md"))
		.option("--save [file]", t("cli.options.save"))
		.option("--copy", t("cli.options.copy"))
		.action((input, sessionId, options) => {
			sessionCommand(input, { ...options, sessionId });
		});

	program
		.command("sessions <project-path>")
		.description(t("cli.commands.sessions"))
		.action((projectPath) => {
			sessionsCommand(projectPath);
		});

	program
		.command("file <path>")
		.description(t("cli.commands.file"))
		.option("--md", t("cli.options.md"))
		.option("--save [file]", t("cli.options.save"))
		.option("--copy", t("cli.options.copy"))
		.option("--user-only", t("cli.options.userOnly"))
		.option("--ai-only", t("cli.options.aiOnly"))
		.option("--tools", t("cli.options.tools"))
		.option("--no-thinking", t("cli.options.noThinking"))
		.action(async (path, options) => {
			await fileCommand(path, options);
		});

	program
		.command("kill [pid]")
		.description(t("cli.commands.kill"))
		.action((pid) => {
			killCommand(pid);
		});

	program
		.command("setup")
		.description(t("cli.commands.setup"))
		.action(() => {
			installCommand();
		});

	program
		.command("uninstall")
		.description(t("cli.commands.uninstall"))
		.action(() => {
			uninstallCommand();
		});

	program
		.command("config [action] [value]")
		.description(t("cli.commands.config"))
		.option("--show", t("cli.options.show"))
		.action((action, value, options) => {
			configCommand(action, value, options);
		});

	return program;
}
