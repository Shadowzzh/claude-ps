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
    -s, --sessions    显示所有会话文件详情
    -d, --debug       显示会话匹配调试信息
    -i, --interval    刷新间隔秒数（默认 2）
    -v, --version     显示版本
    -h, --help        显示帮助

  Examples
    $ claude-ps              启动 TUI
    $ claude-ps --list       列出进程后退出
    $ claude-ps --sessions   显示所有会话文件
    $ claude-ps --json       JSON 格式输出
    $ claude-ps --debug      显示会话匹配详情
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
			sessions: {
				type: "boolean",
				shortFlag: "s",
				default: false,
			},
			debug: {
				type: "boolean",
				shortFlag: "d",
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

const { list, json, sessions, debug, interval } = cli.flags;

if (list || json || sessions || debug) {
	// 非交互模式
	const { getClaudeProcesses } = await import("./utils/process");
	const processes = await getClaudeProcesses();

	if (sessions) {
		const { getAllSessionFiles } = await import("./utils/session");
		console.log("=== Claude Code 会话文件 ===\n");

		for (const proc of processes) {
			console.log(`进程 PID: ${proc.pid}`);
			console.log(`工作目录: ${proc.cwd}`);
			console.log("");

			const sessionFiles = await getAllSessionFiles(proc.cwd);

			if (sessionFiles.length === 0) {
				console.log("  无会话文件\n");
				continue;
			}

			console.log(`  找到 ${sessionFiles.length} 个会话文件:\n`);

			for (const file of sessionFiles) {
				const size = file.size < 1024
					? `${file.size}B`
					: file.size < 1024 * 1024
					? `${(file.size / 1024).toFixed(1)}KB`
					: `${(file.size / (1024 * 1024)).toFixed(1)}MB`;

				const lastActive = file.lastMessageTime
					? new Date(file.lastMessageTime).toLocaleString('zh-CN')
					: "无活动";

				console.log(`  📄 ${file.fileName}`);
				console.log(`     大小: ${size}`);
				console.log(`     消息: ${file.messageCount} 条`);
				console.log(`     最后活动: ${lastActive}`);

				if (file.recentMessages.length > 0) {
					console.log(`     最近消息:`);
					for (const msg of file.recentMessages.slice(-2)) {
						const role = msg.role === "user" ? "[User]" : "[Claude]";
						const content = msg.content.slice(0, 60) + (msg.content.length > 60 ? "..." : "");
						console.log(`       ${role} ${content}`);
					}
				}
				console.log("");
			}

			console.log("---\n");
		}
	} else if (debug) {
		const { debugSessionMatching } = await import("./utils/session");
		const debugInfo = await debugSessionMatching(processes);
		console.log(debugInfo);
	} else if (json) {
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
