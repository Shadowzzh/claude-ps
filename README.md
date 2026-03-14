# claude-ps

TUI 工具，用于查看和管理 Claude Code 进程。

## 安装

```bash
pnpm install
pnpm build
```

## 使用

### TUI 交互模式

```bash
claude-ps
```

快捷键：
- `↑/k`: 上移
- `↓/j`: 下移
- `d`: 删除进程（需确认）
- `r`: 手动刷新
- `q/Esc`: 退出

### 命令行模式

```bash
# 列出所有进程
claude-ps list

# JSON 格式输出
claude-ps list --json
```

## 开发

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 代码检查
pnpm lint
pnpm typecheck
```
