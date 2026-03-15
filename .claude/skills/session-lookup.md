---
name: session-lookup
description: claude-ps 会话查找实现逻辑
---

## 架构

**Hooks 配置** (`~/.claude/settings.json`)
```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "~/.claude/hooks/claude-ps/record-session.sh"
      }]
    }],
    "SessionEnd": [{
      "hooks": [{
        "type": "command",
        "command": "~/.claude/hooks/claude-ps/cleanup-session.sh"
      }]
    }]
  }
}
```

**Hook 脚本** (`~/.claude/hooks/claude-ps/`)
- `record-session.sh` - 从 stdin 获取 SessionID，遍历进程树找 claude PID，写入映射
- `cleanup-session.sh` - 清理已退出进程的映射记录

**代码** (`src/lib/session.ts`)
- `getSessionIdFromPid()` - 从映射文件通过 PID 精确查找
- `getSessionIdFromHistory()` - Fallback：从 history.jsonl 获取项目最新会话
- `getLastUserMessage()` - 获取会话的第一条用户消息

## 数据流

```
Claude 启动 → SessionStart hook → record-session.sh
  ↓
通过 stdin 接收 JSON: {"session_id":"xxx", "cwd":"...", ...}
  ↓
解析 session_id + 遍历进程树找到 claude 进程 PID
  ↓
写入 ~/.claude/session-mappings.jsonl: {"pid":123,"sessionId":"xxx",...}
  ↓
claude-ps 读取映射 → 匹配 PID → 获取 SessionID
  ↓
从 history.jsonl 读取第一条用户消息 → 显示
```

## 关键实现

**SessionID 获取** (`record-session.sh`)
```bash
# 从 Claude Hook 的 stdin 直接获取 SessionID
stdin_data=$(cat)
session_id=$(echo "$stdin_data" | jq -r '.session_id // empty' 2>/dev/null)
```

**Hook stdin JSON 格式**
```json
{
  "session_id": "337fa043-dbdb-48a1-89e1-d61910d6d27f",
  "transcript_path": "/Users/xxx/.claude/projects/.../xxx.jsonl",
  "cwd": "/Users/xxx/project",
  "hook_event_name": "SessionStart",
  "source": "startup",
  "model": "claude-opus-4-5-20251101"
}
```

**PID 获取** (`record-session.sh`)
```bash
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
```

**映射文件格式** (`~/.claude/session-mappings.jsonl`)
```json
{"pid":72214,"sessionId":"d9f70cd1-338a-4a03-8b0b-1a83049ae77f","timestamp":1773496848}
{"pid":72410,"sessionId":"24d978c2-1211-4c5a-aa9d-c81ea346531f","timestamp":1773496852}
```

**查找逻辑** (`src/lib/session.ts`)
1. 优先从 `session-mappings.jsonl` 通过 PID 精确匹配（字段名：`sessionId`）
2. 失败则从 `history.jsonl` 获取项目最新会话（可能不准确）

**会话显示**
- 从 `history.jsonl` 获取会话的第一条用户消息作为摘要
- 新会话未发送消息时显示 "N/A"

## 依赖

- `jq` - 解析 JSON（未安装时静默退出）
