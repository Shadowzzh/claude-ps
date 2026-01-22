# claude-ps

TUI application for viewing and managing Claude Code processes.

## Installation

```bash
npm install -g claude-ps
```

## Usage

```bash
claude-ps              # 启动交互界面
claude-ps --list       # 列出进程（非交互）
claude-ps --json       # JSON 格式输出
claude-ps --interval 5 # 设置刷新间隔（秒）
```

## Keybindings

- `↑/↓` or `j/k` - 移动选择
- `s` - 切换排序方式
- `r` - 刷新
- `d` - 终止进程 (SIGTERM)
- `D` - 强制终止 (SIGKILL)
- `q/ESC` - 退出

## License

MIT
