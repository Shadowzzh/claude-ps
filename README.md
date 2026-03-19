<h1 align="center">Claude Code Peek</h1>

<div align="center">

**快速查看 Claude Code 进程状态和会话内容**



*一眼看清所有进程，快速查看对话，一键干掉卡死实例*

[简介](#简介) • [安装](#安装) • [使用指南](#使用指南) • [工作原理](#工作原理)

</div>

<p align="center">
    <img src="./public/demo.webp" width="800">
</p>

## 简介

快速查看某个 Claude Code 的进程状态和会话内容，尤其是当你有多个 Claude Code 实例在运行时。

`ccpeek` 让你：
- 一眼看清所有 Claude Code 进程
- 快速查看会话对话内容
- 一键干掉卡死的进程

## 安装

```bash
npm install -g  @zhangziheng/claude-peek
ccpeek setup  # 安装 Claude Code Hook 脚本
```

或本地开发：

```bash
pnpm install && pnpm build
```

## 使用指南

### 交互模式

```bash
ccpeek
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
ccpeek list              # 列出所有进程
ccpeek list --json       # JSON 输出
ccpeek show <pid>        # 查看进程详情
ccpeek messages <pid>    # 查看会话对话 (支持 PID 或项目路径)
ccpeek kill <pid>        # 杀掉进程
```

**messages 支持两种方式：**

```bash
# 方式 1: 使用 PID
ccpeek messages 12345

# 方式 2: 使用项目完整路径
ccpeek messages /path/to/project
```

## 工作原理

`ccpeek` 通过 Claude Code 的 hooks 机制实现进程与会话的关联：

1. **SessionStart hook** (`record-session.sh`)
   - 会话启动时自动触发
   - 向上遍历进程树找到 `claude` 主进程 PID
   - 将 `PID ↔ SessionID` 映射写入 `~/.claude/session-mappings.jsonl`

2. **SessionEnd hook** (`cleanup-session.sh`)
   - 会话结束时自动触发
   - 清理已终止进程的映射记录

3. **查询流程**
   - `ccpeek` 读取系统进程列表，找到所有 `claude` 进程
   - 通过 `session-mappings.jsonl` 获取进程对应的 SessionID
   - 从 `~/.claude/sessions/<sessionId>/` 读取会话详情和对话内容

## License

MIT
