import { Box, Text, useApp, useInput, useStdout } from "ink";
import { useState } from "react";
import { HelpBar, MessageDetail, ProcessList, SessionList, StatusBar } from "./components";
import { COLORS } from "./constants/theme";
import { useProcesses } from "./hooks/useProcesses";

interface AppProps {
	interval: number;
}

/**
 * 主应用组件
 * 全屏显示，左右分栏布局，左侧进程列表，右侧详情面板
 * @param interval 自动刷新间隔（秒）
 */
export function App({ interval }: AppProps) {
	const { exit } = useApp();
	const { stdout } = useStdout();
	const termWidth = stdout?.columns || 80;
	const termHeight = stdout?.rows || 24;

	const {
		processes,
		loading,
		error,
		selectedIndex,
		selectedProcess,
		sortField,
		refresh,
		selectNext,
		selectPrev,
		cycleSortField,
		killSelected,
	} = useProcesses(interval);

	// 焦点状态：'list' 表示进程列表，'sessions' 表示会话列表，'detail' 表示消息详情
	const [focusPanel, setFocusPanel] = useState<"list" | "sessions" | "detail">("list");
	// 选中的会话索引
	const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);

	// 计算三列宽度
	const leftWidth = Math.floor(termWidth * 0.35); // 进程列表
	const middleWidth = Math.floor(termWidth * 0.30); // 会话列表
	const rightWidth = termWidth - leftWidth - middleWidth - 2; // 消息详情
	// 主内容区高度 = 终端高度 - 帮助栏(4行)
	const contentHeight = termHeight - 4;

	// 处理键盘输入
	useInput((input, key) => {
		if (input === "q" || key.escape) {
			exit();
		} else if (key.tab) {
			// Tab 键切换焦点：list -> sessions -> detail -> list
			setFocusPanel((prev) => {
				if (prev === "list") return "sessions";
				if (prev === "sessions") return "detail";
				return "list";
			});
			// 切换到会话列表时重置会话选择
			if (focusPanel === "list") {
				setSelectedSessionIndex(0);
			}
		} else if (key.downArrow || input === "j") {
			if (focusPanel === "list") {
				selectNext();
			} else if (focusPanel === "sessions") {
				// 在会话列表中选择下一个会话
				const sessionCount = selectedProcess?.sessionFiles.length || 0;
				if (sessionCount > 0) {
					setSelectedSessionIndex((prev) => Math.min(prev + 1, sessionCount - 1));
				}
			}
		} else if (key.upArrow || input === "k") {
			if (focusPanel === "list") {
				selectPrev();
			} else if (focusPanel === "sessions") {
				// 在会话列表中选择上一个会话
				setSelectedSessionIndex((prev) => Math.max(prev - 1, 0));
			}
		} else if (input === "r") {
			refresh();
		} else if (input === "s") {
			cycleSortField();
		} else if (input === "d") {
			killSelected(false);
		} else if (input === "D") {
			killSelected(true);
		}
	});

	if (error) {
		return (
			<Box flexDirection="column" width={termWidth} height={termHeight}>
				<Text color={COLORS.orphan}>错误: {error}</Text>
			</Box>
		);
	}

	return (
		<Box
			flexDirection="column"
			width={termWidth}
			height={termHeight}
			paddingX={4}
		>
			{/* 主内容区：三列布局 */}
			<Box height={contentHeight}>
				{/* 左侧：进程列表 */}
				<Box width={leftWidth} flexDirection="column" height={contentHeight}>
					{/* 标题栏 */}
					<Box flexDirection="column">
						<Text bold color="cyan">
							{`
┏━╸╻  ┏━┓╻ ╻╺┳┓┏━╸   ┏━┓┏━┓
┃  ┃  ┣━┫┃ ┃ ┃┃┣╸ ╺━╸┣━┛┗━┓
┗━╸┗━╸╹ ╹┗━┛╺┻┛┗━╸   ╹  ┗━┛
`}
						</Text>
					</Box>

					<Box flexDirection="column" height={2}>
						<Text color="gray">Claude Code 进程管理器</Text>
					</Box>

					{/* 状态栏 */}
					<StatusBar processes={processes} />

					<ProcessList
						leftWidth={leftWidth}
						processes={processes}
						selectedIndex={selectedIndex}
						loading={loading}
						isFocused={focusPanel === "list"}
					/>
				</Box>

				{/* 分隔符 1 */}
				<Box width={1} flexDirection="column" height={contentHeight}>
					<Text color={COLORS.label}>{"│\n".repeat(contentHeight).trim()}</Text>
				</Box>

				{/* 中间：会话列表 */}
				<Box
					width={middleWidth}
					flexDirection="column"
					height={contentHeight}
					paddingX={2}
					paddingY={2}
				>
					<SessionList
						sessionFiles={selectedProcess?.sessionFiles || []}
						selectedIndex={selectedSessionIndex}
						isFocused={focusPanel === "sessions"}
					/>
				</Box>

				{/* 分隔符 2 */}
				<Box width={1} flexDirection="column" height={contentHeight}>
					<Text color={COLORS.label}>{"│\n".repeat(contentHeight).trim()}</Text>
				</Box>

				{/* 右侧：消息详情 */}
				<Box
					width={rightWidth}
					flexDirection="column"
					height={contentHeight}
					paddingX={2}
					paddingY={2}
				>
					<MessageDetail
						sessionFile={
							selectedProcess?.sessionFiles[selectedSessionIndex] || null
						}
						isFocused={focusPanel === "detail"}
					/>
				</Box>
			</Box>

			{/* 底部：帮助栏 */}
			<Box
				borderStyle="single"
				borderTop
				borderBottom={false}
				borderLeft={false}
				borderRight={false}
			>
				<HelpBar
					processCount={processes.length}
					interval={interval}
					sortField={sortField}
				/>
			</Box>
		</Box>
	);
}
