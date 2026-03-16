# claude-pm

**Claude Code 管理器**

<!-- GIF/截图位置 -->

## 为什么需要它

快速查看摸个 Claude Code 的进程状态和会话内容，尤其是当你有多个 Claude Code 实例在运行时。

`claude-pm` 让你：
- 一眼看清所有 Claude Code 进程
- 快速查看会话对话内容
- 一键干掉卡死的进程

## 安装

```bash
npm install -g claude-pm
claude-pm setup  # 安装 Claude Code Hook 脚本
```

或本地开发：

```bash
pnpm install && pnpm build
```

## 使用

### 交互模式

```bash
claude-pm
```

**快捷键**
- `↑/k` `↓/j` 上下移动
- `Enter` 查看进程详情
- `s` 查看会话对话
- `d` 删除进程
- `r` 刷新
- `q/Esc` 退出

### 命令行模式

```bash
claude-pm list              # 列出所有进程
claude-pm list --json       # JSON 输出
claude-pm detail <pid>      # 查看进程详情
claude-pm session <pid>     # 查看会话对话
claude-pm kill <pid>        # 杀掉进程
```

## 工作原理

`claude-pm` 通过 Claude Code 的 hooks 机制实现进程与会话的关联：

1. **SessionStart hook** (`record-session.sh`)
   - 会话启动时自动触发
   - 向上遍历进程树找到 `claude` 主进程 PID
   - 将 `PID ↔ SessionID` 映射写入 `~/.claude/session-mappings.jsonl`

2. **SessionEnd hook** (`cleanup-session.sh`)
   - 会话结束时自动触发
   - 清理已终止进程的映射记录

3. **查询流程**
   - `claude-pm` 读取系统进程列表，找到所有 `claude` 进程
   - 通过 `session-mappings.jsonl` 获取进程对应的 SessionID
   - 从 `~/.claude/sessions/<sessionId>/` 读取会话详情和对话内容

## License

MIT
