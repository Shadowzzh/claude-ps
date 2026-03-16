import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
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
	SessionStart?: unknown;
	SessionEnd?: unknown;
}

const RECORD_SESSION_SCRIPT = `#!/bin/bash

MAPPING_FILE="$HOME/.claude/session-mappings.jsonl"

if ! command -v jq &> /dev/null; then
    exit 0
fi

# Read stdin to get session info
stdin_data=$(cat)
session_id=$(echo "$stdin_data" | jq -r '.session_id // empty' 2>/dev/null)
[ -z "$session_id" ] && exit 0

find_claude_pid() {
    local current_pid=$$
    while [ "$current_pid" -ne 1 ] && [ -n "$current_pid" ]; do
        local cmd=$(ps -o comm= -p "$current_pid" 2>/dev/null | tr -d ' ')
        if [ "$cmd" = "claude" ]; then
            echo "$current_pid"
            return 0
        fi
        current_pid=$(ps -o ppid= -p "$current_pid" 2>/dev/null | tr -d ' ')
    done
    return 1
}

claude_pid=$(find_claude_pid)
[ -z "$claude_pid" ] && exit 0

mkdir -p "$(dirname "$MAPPING_FILE")"
echo "{\\"pid\\":$claude_pid,\\"sessionId\\":\\"$session_id\\",\\"timestamp\\":$(date +%s)}" >> "$MAPPING_FILE"
`;

const CLEANUP_SESSION_SCRIPT = `#!/bin/bash

MAPPING_FILE="$HOME/.claude/session-mappings.jsonl"

if ! command -v jq &> /dev/null; then
    exit 0
fi

[ ! -f "$MAPPING_FILE" ] && exit 0

temp_file=$(mktemp)
while IFS= read -r line; do
    pid=$(echo "$line" | jq -r '.pid')
    if ps -p "$pid" > /dev/null 2>&1; then
        echo "$line" >> "$temp_file"
    fi
done < "$MAPPING_FILE"

mv "$temp_file" "$MAPPING_FILE"
`;

export function installCommand() {
	const targetDir = join(homedir(), ".claude", "hooks", "ccpeek");
	const settingsFile = join(homedir(), ".claude", "settings.json");
	const mappingFile = join(homedir(), ".claude", "session-mappings.jsonl");

	if (!existsSync(targetDir)) {
		mkdirSync(targetDir, { recursive: true });
	}

	if (existsSync(mappingFile)) {
		writeFileSync(mappingFile, "");
		console.log("✓ 已清空旧的映射文件");
	}

	const scripts = [
		{ name: "record-session.sh", content: RECORD_SESSION_SCRIPT },
		{ name: "cleanup-session.sh", content: CLEANUP_SESSION_SCRIPT },
	];

	for (const { name, content } of scripts) {
		const target = join(targetDir, name);
		writeFileSync(target, content, { mode: 0o755 });
		console.log(`✓ 已安装: ${target}`);
	}

	let settings: Settings = {};
	if (existsSync(settingsFile)) {
		settings = JSON.parse(readFileSync(settingsFile, "utf-8"));
	}

	settings.hooks = settings.hooks || {};
	settings.hooks.SessionStart = settings.hooks.SessionStart || [];
	settings.hooks.SessionEnd = settings.hooks.SessionEnd || [];

	const recordHook: Hook = {
		type: "command",
		command: "~/.claude/hooks/ccpeek/record-session.sh",
	};
	const cleanupHook: Hook = {
		type: "command",
		command: "~/.claude/hooks/ccpeek/cleanup-session.sh",
	};

	const startEntry = settings.hooks.SessionStart.find((e) =>
		e.hooks.some((h) => h.command.includes("ccpeek")),
	);
	if (startEntry) {
		const idx = startEntry.hooks.findIndex((h) => h.command.includes("ccpeek"));
		startEntry.hooks[idx] = recordHook;
	} else {
		settings.hooks.SessionStart.push({ hooks: [recordHook] });
	}

	const endEntry = settings.hooks.SessionEnd.find((e) =>
		e.hooks.some((h) => h.command.includes("ccpeek")),
	);
	if (endEntry) {
		const idx = endEntry.hooks.findIndex((h) => h.command.includes("ccpeek"));
		endEntry.hooks[idx] = cleanupHook;
	} else {
		settings.hooks.SessionEnd.push({ hooks: [cleanupHook] });
	}

	settings.SessionStart = undefined;
	settings.SessionEnd = undefined;

	writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
	console.log(`\n✓ 已更新配置: ${settingsFile}`);
}
