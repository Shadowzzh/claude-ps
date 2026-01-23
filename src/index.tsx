import { withFullScreen } from "fullscreen-ink";
import meow from "meow";
import { App } from "./App";

const cli = meow(
	`
  Usage
    $ claude-ps [options]

  Options
    -l, --list        非交互模式，仅列出进程
    -j, --json        JSON 格式输出（配合 --list）
    -i, --interval    刷新间隔秒数（默认 2）
    -v, --version     显示版本
    -h, --help        显示帮助

  Examples
    $ claude-ps              启动 TUI
    $ claude-ps --list       列出进程后退出
    $ claude-ps --json       JSON 格式输出
    $ claude-ps -i 5         设置刷新间隔为 5 秒
`,
	{
		importMeta: import.meta,
		flags: {
			help: {
				type: "boolean",
				shortFlag: "h",
				default: false,
			},
			list: {
				type: "boolean",
				shortFlag: "l",
				default: false,
			},
			json: {
				type: "boolean",
				shortFlag: "j",
				default: false,
			},
			interval: {
				type: "number",
				shortFlag: "i",
				default: 2,
			},
			version: {
				type: "boolean",
				shortFlag: "v",
				default: false,
			},
		},
	},
);

const { list, json, interval } = cli.flags;

if (list || json) {
	// 非交互模式
	const { getClaudeProcesses } = await import("./utils/process");
	const processes = await getClaudeProcesses();

	if (json) {
		console.log(JSON.stringify(processes, null, 2));
	} else {
		console.log("PID\tTTY\tCWD");
		for (const proc of processes) {
			console.log(`${proc.pid}\t${proc.tty}\t${proc.cwd}`);
		}
	}
	process.exit(0);
}

// 交互模式：启动全屏 TUI（使用 alternate screen buffer）
withFullScreen(<App interval={interval} />).start();
