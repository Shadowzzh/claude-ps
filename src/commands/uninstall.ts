import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

interface Hook {
	type: string;
	command: string;
}

interface HookEntry {
	hooks: Hook[];
}

interface Settings {
	hooks?: {
		SessionStart?: HookEntry[];
		SessionEnd?: HookEntry[];
	};
	[key: string]: unknown;
}

export function uninstallCommand() {
	const targetDir = join(homedir(), ".claude", "hooks", "ccpeek");
	const settingsFile = join(homedir(), ".claude", "settings.json");
	const mappingFile = join(homedir(), ".claude", "session-mappings.jsonl");

	// Delete script directory
	if (existsSync(targetDir)) {
		rmSync(targetDir, { recursive: true, force: true });
		console.log(`✓ 已删除脚本目录: ${targetDir}`);
	} else {
		console.log(`- 脚本目录不存在，已跳过: ${targetDir}`);
	}

	// Delete mapping file
	if (existsSync(mappingFile)) {
		rmSync(mappingFile, { force: true });
		console.log(`✓ 已删除映射文件: ${mappingFile}`);
	} else {
		console.log(`- 映射文件不存在，已跳过: ${mappingFile}`);
	}

	// Clean up settings.json
	if (!existsSync(settingsFile)) {
		console.log(`- 配置文件不存在，已跳过: ${settingsFile}`);
		return;
	}

	try {
		const settings: Settings = JSON.parse(readFileSync(settingsFile, "utf-8"));

		if (!settings.hooks) {
			console.log("- 配置文件中没有 hooks 配置");
			return;
		}

		let modified = false;

		// Clean SessionStart hooks
		if (settings.hooks.SessionStart) {
			const filtered = settings.hooks.SessionStart.map((entry) => ({
				hooks: entry.hooks.filter((h) => !h.command.includes("ccpeek")),
			})).filter((entry) => entry.hooks.length > 0);

			if (filtered.length !== settings.hooks.SessionStart.length) {
				settings.hooks.SessionStart = filtered;
				modified = true;
			}
		}

		// Clean SessionEnd hooks
		if (settings.hooks.SessionEnd) {
			const filtered = settings.hooks.SessionEnd.map((entry) => ({
				hooks: entry.hooks.filter((h) => !h.command.includes("ccpeek")),
			})).filter((entry) => entry.hooks.length > 0);

			if (filtered.length !== settings.hooks.SessionEnd.length) {
				settings.hooks.SessionEnd = filtered;
				modified = true;
			}
		}

		if (modified) {
			writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
			console.log(`✓ 已更新配置: ${settingsFile}`);
		} else {
			console.log("- 配置文件中没有 ccpeek 相关的 hooks");
		}
	} catch (error) {
		console.error(`✗ 处理配置文件时出错: ${error}`);
	}
}
