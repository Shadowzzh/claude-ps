# 代码结构重构实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 claude-ps 从 6 个文件重构为 13 个文件，实现职责分离和单向数据流。

**Architecture:** 入口层分离 CLI 和 TUI，组件层拆分为独立组件，状态管理集中到自定义 hook，格式化函数抽取到 lib/format.ts。

**Tech Stack:** TypeScript, React, Ink, Commander

---

### Task 1: 创建类型定义文件

**Files:**
- Create: `src/types.ts`

**Step 1: 创建 types.ts**

```typescript
export interface ProcessInfo {
	pid: number;
	cpu: string;
	mem: string;
	etime: string;
	cwd: string;
	command: string;
}
```

**Step 2: 验证文件创建成功**

Run: `ls src/types.ts`
Expected: 文件存在

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "refactor: 创建类型定义文件"
```

---

### Task 2: 创建格式化函数模块

**Files:**
- Create: `src/lib/format.ts`
- Modify: `src/lib/process.ts`

**Step 1: 创建 format.ts**

```typescript
/**
 * 格式化运行时长为 HH:MM:SS
 */
export function formatEtime(etime: string): string {
	const parts = etime.trim().split(/[-:]/);
	if (parts.length === 2) {
		// MM:SS
		return `00:${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
	}
	if (parts.length === 3) {
		// HH:MM:SS
		return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:${parts[2].padStart(2, "0")}`;
	}
	if (parts.length === 4) {
		// DD-HH:MM:SS
		const hours = Number.parseInt(parts[0]) * 24 + Number.parseInt(parts[1]);
		return `${String(hours).padStart(2, "0")}:${parts[2].padStart(2, "0")}:${parts[3].padStart(2, "0")}`;
	}
	return "00:00:00";
}
```

**Step 2: 修改 process.ts，移除 formatEtime 并导入**

从 process.ts 删除 formatEtime 函数（第 68-87 行），添加导入：

```typescript
import { formatEtime } from "./format.js";
```

同时修改 ProcessInfo 的导入来源：

```typescript
import type { ProcessInfo } from "../types.js";
```

并删除 process.ts 中的 ProcessInfo 接口定义（第 3-10 行），改为重新导出：

```typescript
export type { ProcessInfo } from "../types.js";
```

**Step 3: 验证构建**

Run: `pnpm typecheck`
Expected: 无错误

**Step 4: Commit**

```bash
git add src/lib/format.ts src/lib/process.ts
git commit -m "refactor: 抽取格式化函数到 format.ts"
```

---

### Task 3: 创建 HelpBar 组件

**Files:**
- Create: `src/components/HelpBar.tsx`

**Step 1: 创建 HelpBar.tsx**

```typescript
import { Text } from "ink";
import React from "react";

export function HelpBar() {
	return <Text dimColor>↑/k:上移 ↓/j:下移 d:删除 r:刷新 q:退出</Text>;
}
```

**Step 2: 验证构建**

Run: `pnpm typecheck`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/components/HelpBar.tsx
git commit -m "refactor: 创建 HelpBar 组件"
```

---

### Task 4: 创建 ConfirmDialog 组件

**Files:**
- Create: `src/components/ConfirmDialog.tsx`

**Step 1: 创建 ConfirmDialog.tsx**

```typescript
import { Box, Text } from "ink";
import React from "react";

interface ConfirmDialogProps {
	pid: number;
	visible: boolean;
}

export function ConfirmDialog({ pid, visible }: ConfirmDialogProps) {
	if (!visible) return null;

	return (
		<Box borderStyle="round" borderColor="red" padding={1}>
			<Text color="red">确认杀死进程 {pid}? (y/n)</Text>
		</Box>
	);
}
```

**Step 2: 验证构建**

Run: `pnpm typecheck`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/components/ConfirmDialog.tsx
git commit -m "refactor: 创建 ConfirmDialog 组件"
```

---

### Task 5: 创建 ProcessRow 组件

**Files:**
- Create: `src/components/ProcessRow.tsx`

**Step 1: 创建 ProcessRow.tsx**

```typescript
import { Text } from "ink";
import React from "react";
import type { ProcessInfo } from "../types.js";

interface ProcessRowProps {
	proc: ProcessInfo;
	isSelected: boolean;
}

export function ProcessRow({ proc, isSelected }: ProcessRowProps) {
	return (
		<Text
			backgroundColor={isSelected ? "blue" : undefined}
			color={isSelected ? "white" : undefined}
		>
			{String(proc.pid).padEnd(8)}
			{proc.cpu.padEnd(8)}
			{proc.mem.padEnd(8)}
			{proc.etime.padEnd(12)}
			{proc.cwd}
		</Text>
	);
}
```

**Step 2: 验证构建**

Run: `pnpm typecheck`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/components/ProcessRow.tsx
git commit -m "refactor: 创建 ProcessRow 组件"
```

---

### Task 6: 创建 ProcessList 组件

**Files:**
- Create: `src/components/ProcessList.tsx`

**Step 1: 创建 ProcessList.tsx**

```typescript
import { Box, Text } from "ink";
import React from "react";
import type { ProcessInfo } from "../types.js";
import { ProcessRow } from "./ProcessRow.js";

interface ProcessListProps {
	processes: ProcessInfo[];
	selectedIndex: number;
}

export function ProcessList({ processes, selectedIndex }: ProcessListProps) {
	if (processes.length === 0) {
		return <Text color="yellow">未找到运行中的 Claude Code 进程</Text>;
	}

	return (
		<Box flexDirection="column">
			{/* 表头 */}
			<Text bold color="gray">
				{"PID".padEnd(8)}
				{"CPU".padEnd(8)}
				{"MEM".padEnd(8)}
				{"运行时长".padEnd(12)}工作目录
			</Text>

			{/* 进程列表 */}
			{processes.map((proc, index) => (
				<ProcessRow
					key={proc.pid}
					proc={proc}
					isSelected={index === selectedIndex}
				/>
			))}
		</Box>
	);
}
```

**Step 2: 验证构建**

Run: `pnpm typecheck`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/components/ProcessList.tsx
git commit -m "refactor: 创建 ProcessList 组件"
```

---

### Task 7: 创建 useProcessManager hook

**Files:**
- Create: `src/hooks/useProcessManager.ts`

**Step 1: 创建 hooks 目录和 useProcessManager.ts**

```typescript
import { useApp, useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import { getClaudeProcesses, killProcess } from "../lib/process.js";
import type { ProcessInfo } from "../types.js";

export function useProcessManager() {
	const [processes, setProcesses] = useState<ProcessInfo[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [showConfirm, setShowConfirm] = useState(false);
	const { exit } = useApp();

	const loadProcesses = useCallback(() => {
		const procs = getClaudeProcesses();
		setProcesses(procs);
		setSelectedIndex((prev) =>
			prev >= procs.length && procs.length > 0 ? procs.length - 1 : prev,
		);
	}, []);

	// 初始加载和自动刷新
	useEffect(() => {
		loadProcesses();
		const interval = setInterval(loadProcesses, 3000);
		return () => clearInterval(interval);
	}, [loadProcesses]);

	// 键盘事件
	useInput((input, key) => {
		if (showConfirm) {
			if (input === "y" || input === "Y") {
				const proc = processes[selectedIndex];
				if (proc) {
					killProcess(proc.pid);
					setTimeout(loadProcesses, 100);
				}
				setShowConfirm(false);
			} else if (input === "n" || input === "N" || key.escape) {
				setShowConfirm(false);
			}
			return;
		}

		if (key.upArrow || input === "k") {
			setSelectedIndex((i) => Math.max(0, i - 1));
		} else if (key.downArrow || input === "j") {
			setSelectedIndex((i) => Math.min(processes.length - 1, i + 1));
		} else if (input === "d" && processes.length > 0) {
			setShowConfirm(true);
		} else if (input === "r") {
			loadProcesses();
		} else if (input === "q" || key.escape) {
			exit();
		}
	});

	return {
		processes,
		selectedIndex,
		showConfirm,
		selectedProcess: processes[selectedIndex],
	};
}
```

**Step 2: 验证构建**

Run: `pnpm typecheck`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/hooks/useProcessManager.ts
git commit -m "refactor: 创建 useProcessManager hook"
```

---

### Task 8: 重构 App.tsx

**Files:**
- Modify: `src/components/App.tsx`

**Step 1: 重写 App.tsx 为纯组合组件**

```typescript
import { Box, Text } from "ink";
import React from "react";
import { useProcessManager } from "../hooks/useProcessManager.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { HelpBar } from "./HelpBar.js";
import { ProcessList } from "./ProcessList.js";

export function App() {
	const { processes, selectedIndex, showConfirm, selectedProcess } =
		useProcessManager();

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				Claude Code 进程管理器
			</Text>
			<Text dimColor> </Text>

			<ProcessList processes={processes} selectedIndex={selectedIndex} />

			<Text dimColor> </Text>

			{showConfirm && selectedProcess ? (
				<ConfirmDialog pid={selectedProcess.pid} visible={showConfirm} />
			) : (
				<HelpBar />
			)}
		</Box>
	);
}
```

**Step 2: 验证构建**

Run: `pnpm typecheck`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/components/App.tsx
git commit -m "refactor: 重构 App.tsx 为纯组合组件"
```

---

### Task 9: 拆分入口文件

**Files:**
- Create: `src/cli.ts`
- Create: `src/main.tsx`
- Modify: `src/index.tsx` → `src/index.ts`

**Step 1: 创建 cli.ts**

```typescript
import { createRequire } from "node:module";
import { Command } from "commander";
import { listCommand } from "./commands/list.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

export function createCli() {
	const program = new Command();

	program
		.name("claude-ps")
		.description("TUI application for viewing and managing Claude Code processes")
		.version(version);

	program
		.command("list")
		.description("列出所有 Claude Code 进程")
		.option("--json", "以 JSON 格式输出")
		.action((options) => {
			listCommand(options);
		});

	return program;
}
```

**Step 2: 创建 main.tsx**

```typescript
import { render } from "ink";
import React from "react";
import { App } from "./components/App.js";

export function startTui() {
	render(<App />);
}
```

**Step 3: 重写 index.tsx 为 index.ts**

删除 `src/index.tsx`，创建 `src/index.ts`：

```typescript
#!/usr/bin/env node
import { createCli } from "./cli.js";
import { startTui } from "./main.js";

const program = createCli();

// 默认命令：启动 TUI
program.action(() => {
	startTui();
});

program.parse();
```

**Step 4: 验证构建**

Run: `pnpm typecheck`
Expected: 无错误

**Step 5: Commit**

```bash
git rm src/index.tsx
git add src/cli.ts src/main.tsx src/index.ts
git commit -m "refactor: 拆分入口文件为 cli.ts, main.tsx, index.ts"
```

---

### Task 10: 更新 list.ts 导入

**Files:**
- Modify: `src/commands/list.ts`

**Step 1: 更新导入路径**

修改 list.ts 的导入，使用 types.ts：

```typescript
import chalk from "chalk";
import { getClaudeProcesses } from "../lib/process.js";
import type { ProcessInfo } from "../types.js";
```

（注意：ProcessInfo 类型现在从 types.ts 导入，但由于 process.ts 重新导出了它，原有导入也能工作。为了一致性，建议直接从 types.ts 导入。）

**Step 2: 验证构建**

Run: `pnpm typecheck`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/commands/list.ts
git commit -m "refactor: 更新 list.ts 导入路径"
```

---

### Task 11: 最终验证

**Step 1: 完整类型检查**

Run: `pnpm typecheck`
Expected: 无错误

**Step 2: 构建项目**

Run: `pnpm build`
Expected: 构建成功

**Step 3: 运行测试**

Run: `pnpm claude-ps list`
Expected: 正常显示进程列表

**Step 4: 验证文件结构**

Run: `find src -type f -name "*.ts" -o -name "*.tsx" | sort`
Expected:
```
src/cli.ts
src/commands/list.ts
src/components/App.tsx
src/components/ConfirmDialog.tsx
src/components/HelpBar.tsx
src/components/ProcessList.tsx
src/components/ProcessRow.tsx
src/hooks/useProcessManager.ts
src/index.ts
src/lib/format.ts
src/lib/process.ts
src/main.tsx
src/types.ts
```

**Step 5: 最终 Commit**

```bash
git add -A
git commit -m "refactor: 完成代码结构重构"
```
