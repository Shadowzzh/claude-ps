<h1 align="center">ccpeek</h1>

<div align="center">

**Claude Code Process Viewer for Terminal**


[English](./README.md) | [简体中文](./README.zh-CN.md)


*View processes, read sessions, clean up stuck instances*

[Quick Start](#quick-start) • [Features](#features) • [Commands](#commands) • [How It Works](#how-it-works) • [Privacy & Security](#privacy--security) • [FAQ](#faq) • [Troubleshooting](#troubleshooting) • [Uninstall](#uninstall) • [Roadmap](#roadmap)

</div>

<p align="center">
    <img src="./public/demo.webp" width="800">
</p>




## Why ccpeek?

Running multiple Claude Code sessions quickly becomes chaotic.

- `ps` / `top` only show PIDs, not what Claude tasks are actually doing
- Digging through `~/.claude/projects/` is slow and disconnected from live process state
- Cleaning up stuck instances is more painful than it should be

**ccpeek brings process state, session content, and cleanup into one terminal workflow.**

## Why not just use `ps` or manually check `~/.claude`?

| Method | Good for | Missing |
|---|---|---|
| `ps` / `top` | Viewing running processes | No idea what Claude sessions are actually doing |
| Manual `~/.claude` inspection | Reading stored session files | Slow, fragmented, disconnected from live process state |
| `ccpeek` | Unified process + session + cleanup workflow | Only focused on Claude Code workflow |

## Quick Start

```bash
npm install -g @zhangziheng/claude-peek
ccpeek setup
ccpeek
```

## Features

* List all Claude Code processes with project paths
* View live session messages in terminal
* Kill stuck instances directly
* Browse history by project after process ends
* Export conversations to Markdown

## Commands

### Interactive Mode

```bash
ccpeek
```

**Shortcuts:**
- `↑/k` `↓/j` - Move up/down
- `Enter` - View session messages
- `v` - View process details
- `d` - Delete process
- `r` - Refresh
- `q/Esc` - Quit

**View process details:**

<p align="center">
    <img src="./public/view-detail.gif" width="800">
</p>

**View session messages:**

<p align="center">
    <img src="./public/view-message.gif" width="800">
</p>

### CLI Mode

```bash
ccpeek list              # List all processes
ccpeek list --json       # JSON output
ccpeek show <pid>        # View process details
ccpeek messages <pid>    # View session messages
ccpeek kill <pid>        # Kill process
```

**messages supports multiple input methods:**

```bash
# Method 1: Use PID (running process)
ccpeek messages 12345

# Method 2: Use project path (running or historical session)
ccpeek messages /path/to/project

# Method 3: Specify historical session ID
ccpeek messages /path/to/project abc123-session-id
```

**Output options:**

```bash
ccpeek messages 12345           # Colored terminal output
ccpeek messages 12345 --md      # Markdown output to stdout
ccpeek messages 12345 --save    # Save to file
ccpeek messages 12345 --copy    # Copy to clipboard
```

## How It Works

ccpeek establishes `PID ↔ SessionID` mapping via Claude Code hooks, then reads session data from `~/.claude/projects/`.

**Flow:**
1. SessionStart hook captures PID and SessionID
2. Mapping stored in `~/.claude/ccpeek/session-mappings.jsonl`
3. ccpeek reads process list + mapping + session files

## Privacy & Security

```
[✓] Local only      - Only reads ~/.claude files
[✓] No uploads      - Zero data transmission
[✓] Minimal hooks   - Only records PID/SessionID mapping
[✓] Easy uninstall  - ccpeek uninstall cleans everything
```

## FAQ

**Q: Will it modify my Claude Code configuration?**
A: Only adds hooks to `.claude/hooks/`, doesn't touch existing config.

**Q: Can I view sessions after process ends?**
A: Yes, use `ccpeek messages /path/to/project`

**Q: What if hook installation fails?**
A: ccpeek can still view existing sessions, just can't track new PIDs.

**Q: Can I use it on remote servers?**
A: Yes, as long as Claude Code runs there.

## Troubleshooting

**Hook installation fails:**
```bash
# Check Claude Code directory
ls ~/.claude/hooks/

# Reinstall
ccpeek uninstall
ccpeek setup
```

**Session not found:**
```bash
# Verify session files exist
ls ~/.claude/projects/

# Check mappings
cat ~/.claude/ccpeek/session-mappings.jsonl
```

**Permission denied:**
```bash
# Fix permissions
chmod +x ~/.claude/hooks/*.sh
```

## Uninstall

```bash
ccpeek uninstall
npm uninstall -g @zhangziheng/claude-peek
```

## Roadmap

- [ ] Remote machine support

