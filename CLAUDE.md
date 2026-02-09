# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

claude-ps 是一个用于查看和管理 Claude Code 进程的 TUI（终端用户界面）应用。它使用 Ink（React for CLI）构建，支持实时监控多个 Claude Code 会话。

## 开发命令

```bash
# 开发模式（直接运行源码）
pnpm dev

# 构建
pnpm build

# 代码检查
pnpm lint           # 检查代码风格和错误
pnpm lint:fix       # 自动修复问题
pnpm format         # 格式化代码

# 类型检查
pnpm typecheck      # TypeScript 类型检查

# 运行所有检查
pnpm all            # format + typecheck + lint
```

## 代码风格

项目使用 **Biome** 进行代码格式化和检查：
- 缩进：Tab（2 宽度）
- 引号：双引号
- 分号：始终使用
- 配置文件：`biome.json`

## 架构设计

### 核心技术栈

- **UI 框架**：Ink（React for CLI）+ `fullscreen-ink`（全屏备用屏幕缓冲区）
- **构建工具**：tsup（打包成 ESM）
- **文件监听**：chokidar（监听会话文件变化）
- **CLI 参数**：meow

### 目录结构

```
src/
├── index.tsx              # 入口点，处理 CLI 参数和模式分发
├── App.tsx                # 主应用组件，布局和键盘输入
├── types/index.ts         # TypeScript 类型定义
├── constants/theme.ts     # UI 常量（颜色、列宽、阈值）
├── components/
│   ├── index.ts           # 组件导出
│   ├── ProcessList.tsx    # 进程列表（主组件）
│   └── ui/
│       ├── theme.ts       # 主题配置
│       ├── primitives.tsx # UI 原语（Separator、EmptyPrompt 等）
│       ├── ProcessItem.tsx   # 单个进程项
│       ├── StatusBar.tsx     # 状态栏
│       ├── HelpBar.tsx       # 帮助栏
│       └── DetailPanel.tsx   # 详情面板
├── hooks/
│   ├── useProcesses.ts        # 进程管理核心逻辑
│   └── useSessionWatcher.ts   # 会话文件监听
└── utils/
    ├── process.ts         # 进程发现和统计（ps、lsof）
    └── session.ts         # 会话文件解析和消息提取
```

### 关键设计模式

#### 1. 双模式运行

- **交互模式**（默认）：使用 `fullscreen-ink` 启动全屏 TUI
- **非交互模式**（`--list`/`--json`）：输出进程列表后立即退出

参见：`src/index.tsx:57-74`

#### 2. 进程发现流程

1. 通过 `ps` 命令查找所有 `claude` 进程（排除 `chrome-native-host`）
2. 对每个进程并行获取：
   - 工作目录（`lsof -p <pid> | grep cwd`）
   - CPU/内存/运行时长（`ps -p <pid> -o %cpu,%mem,etime`）
3. 根据工作目录匹配对应的会话文件（位于 `~/.claude/projects/<project-dir>/`）

参见：`src/utils/process.ts:96-145`

#### 3. 会话文件匹配策略

`getSessionPath(cwd, startTime)` 使用多策略匹配会话文件：

1. **创建时间匹配**（新建会话，10 秒容差）
2. **修改时间匹配**（resume 会话，60 秒容差）
3. **回退**：选择最新修改的文件（过滤掉 < 1KB 的文件）

参见：`src/utils/session.ts:22-93`

#### 4. 增量消息更新

- 首次加载：读取所有消息（`getAllMessages`）
- 后续更新：通过 chokidar 监听文件变化，增量读取新消息（`getNewMessages`）
- 防抖：100ms 内只触发一次更新

参见：`src/hooks/useSessionWatcher.ts` 和 `src/hooks/useProcesses.ts:107-140`

#### 5. UI 组件分层

借鉴 `@inkjs/ui` 的设计模式：

- **原语层**（`ui/primitives.tsx`）：可复用的基础组件
- **主题层**（`ui/theme.ts`）：统一的颜色和间距配置
- **业务层**（`ProcessList.tsx`, `DetailPanel.tsx`）：应用特定逻辑

### 类型系统

核心类型定义在 `src/types/index.ts`：

- `ClaudeProcess`：基础进程信息
- `EnrichedProcess`：包含会话消息的增强进程信息
- `SessionMessage`：会话消息（用户/助手）
- `SortField`：排序字段类型

### 键盘输入处理

所有键盘输入在 `App.tsx` 的 `useInput` 钩子中集中处理：

- `↑/↓` 或 `j/k`：选择进程
- `s`：切换排序（CPU → 内存 → 运行时长 → 默认）
- `r`：手动刷新
- `d`：SIGTERM 终止
- `D`：SIGKILL 强制终止
- `q/ESC`：退出

参见：`src/App.tsx:36-52`

## macOS 特定实现

部分命令依赖 macOS 特定工具：

- `ps -eo pid,tty,command`：进程列表
- `lsof -p <pid>`：获取工作目录
- `tty`：获取当前终端名称

## 发布流程

```bash
# 构建 CLI（添加 shebang）
pnpm build

# 全局安装测试
npm install -g .

# 发布到 npm
npm publish
```

构建后的二进制在 `dist/index.js`，tsup 会自动添加 `#!/usr/bin/env node` shebang。

## 常见任务

### 添加新的键盘快捷键

在 `src/App.tsx` 的 `useInput` 回调中添加处理逻辑。

### 修改进程排序方式

1. 在 `src/types/index.ts` 扩展 `SortField` 类型
2. 在 `src/hooks/useProcesses.ts` 的 `sortProcesses` 函数中添加排序逻辑
3. 在 `cycleSortField` 中添加到循环顺序

### 添加新的 UI 组件

参考 `src/components/ui/primitives.tsx` 中的原语组件，确保：
- 使用 `theme` 中定义的颜色
- 遵循 Ink 组件模式（Box、Text）
- 导出并通过 `src/components/index.ts` 暴露
