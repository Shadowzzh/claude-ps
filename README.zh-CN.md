<h1 align="center">ccpeek</h1>

<div align="center">

**终端下的 Claude Code 进程查看器**


[English](./README.md) | [简体中文](./README.zh-CN.md)


*查看进程、读取会话、清理卡死实例*

[快速开始](#快速开始) • [功能特性](#功能特性) • [命令](#命令) • [工作原理](#工作原理) • [隐私与安全](#隐私与安全) • [常见问题](#常见问题) • [故障排查](#故障排查) • [卸载](#卸载) • [路线图](#路线图)

</div>

<p align="center">
    <img src="./public/demo.webp" width="800">
</p>




## 为什么需要 ccpeek？

同时运行多个 Claude Code 会话很快就会变得混乱。

- `ps` / `top` 只显示 PID，看不到 Claude 任务实际在做什么
- 在 `~/.claude/projects/` 里翻找文件既慢又与实时进程状态脱节
- 清理卡死的实例比应该的更麻烦

**ccpeek 把进程状态、会话内容和清理操作整合到一个终端工作流中。**

## 为什么不直接用 `ps` 或手动检查 `~/.claude`？

| 方法 | 适合 | 缺少 |
|---|---|---|
| `ps` / `top` | 查看运行中的进程 | 无法知道 Claude 会话实际在做什么 |
| 手动检查 `~/.claude` | 读取存储的会话文件 | 慢、碎片化、与实时进程状态脱节 |
| `ccpeek` | 进程 + 会话 + 清理一体化工作流 | 仅专注于 Claude Code 工作流 |

## 快速开始

```bash
npm install -g @zhangziheng/claude-peek
ccpeek setup
ccpeek
```

## 功能特性

* 列出所有 Claude Code 进程及项目路径
* 在终端查看实时会话消息
* 直接终止卡死的实例
* 进程结束后按项目浏览历史会话
* 导出对话为 Markdown

## 命令

### 交互模式

```bash
ccpeek
```

**快捷键：**
- `↑/k` `↓/j` - 上下移动
- `Enter` - 查看会话对话
- `v` - 查看进程详情
- `d` - 删除进程
- `r` - 刷新
- `q/Esc` - 退出

**查看进程详情：**

<p align="center">
    <img src="./public/view-detail.gif" width="800">
</p>

**查看会话对话：**

<p align="center">
    <img src="./public/view-message.gif" width="800">
</p>

### 命令行模式

```bash
ccpeek list              # 列出所有进程
ccpeek list --json       # JSON 输出
ccpeek show <pid>        # 查看进程详情
ccpeek messages <pid>    # 查看会话对话
ccpeek kill <pid>        # 杀掉进程
```

**messages 支持多种输入方式：**

```bash
# 方式 1: 使用 PID（运行中的进程）
ccpeek messages 12345

# 方式 2: 使用项目路径（运行中或历史会话）
ccpeek messages /path/to/project

# 方式 3: 指定历史会话 ID
ccpeek messages /path/to/project abc123-session-id
```

**输出选项：**

```bash
ccpeek messages 12345           # 终端彩色输出
ccpeek messages 12345 --md      # Markdown 输出到 stdout
ccpeek messages 12345 --save    # 保存为文件
ccpeek messages 12345 --copy    # 复制到剪贴板
```

## 工作原理

ccpeek 通过 Claude Code hooks 建立 `PID ↔ SessionID` 映射，然后从 `~/.claude/projects/` 读取会话数据。

**流程：**
1. SessionStart hook 捕获 PID 和 SessionID
2. 映射存储在 `~/.claude/ccpeek/session-mappings.jsonl`
3. ccpeek 读取进程列表 + 映射 + 会话文件

## 隐私与安全

```
[✓] 仅本地      - 只读取 ~/.claude 文件
[✓] 不上传      - 零数据外传
[✓] 最小化 hooks - 仅记录 PID/SessionID 映射
[✓] 易卸载      - ccpeek uninstall 清理所有内容
```

## 常见问题

**Q: 会修改我的 Claude Code 配置吗？**
A: 只在 `.claude/hooks/` 添加 hooks，不动原有配置。

**Q: 进程结束后还能看会话吗？**
A: 可以，使用 `ccpeek messages /path/to/project`

**Q: 如果 hooks 安装失败怎么办？**
A: ccpeek 仍可查看已有会话，只是无法追踪新的 PID。

**Q: 能在远程服务器上用吗？**
A: 可以，只要那里运行了 Claude Code。

## 故障排查

**Hook 安装失败：**
```bash
# 检查 Claude Code 目录
ls ~/.claude/hooks/

# 重新安装
ccpeek uninstall
ccpeek setup
```

**找不到会话：**
```bash
# 验证会话文件存在
ls ~/.claude/projects/

# 检查映射文件
cat ~/.claude/ccpeek/session-mappings.jsonl
```

**权限被拒绝：**
```bash
# 修复权限
chmod +x ~/.claude/hooks/*.sh
```

## 卸载

```bash
ccpeek uninstall
npm uninstall -g @zhangziheng/claude-peek
```

## 路线图

- [ ] 远程机器支持

