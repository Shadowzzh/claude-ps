import { Box, Text, useApp, useInput, useStdout } from "ink";
import { DetailPanel, HelpBar, ProcessList, StatusBar } from "./components";
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

	// 处理键盘输入
	useInput((input, key) => {
		if (input === "q" || key.escape) {
			exit();
		} else if (key.downArrow || input === "j") {
			selectNext();
		} else if (key.upArrow || input === "k") {
			selectPrev();
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

	// 计算左右面板宽度
	const leftWidth = Math.floor(termWidth * 0.45);
	const rightWidth = termWidth - leftWidth - 1;
	// 主内容区高度 = 终端高度 - 帮助栏(4行)
	const contentHeight = termHeight - 4;

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
			{/* 主内容区：左右分栏 */}
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
					/>
				</Box>

				{/* 分隔符 */}
				<Box width={1} flexDirection="column" height={contentHeight}>
					<Text color={COLORS.label}>{"│\n".repeat(contentHeight).trim()}</Text>
				</Box>

				{/* 右侧：详情面板 */}
				<Box
					width={rightWidth}
					flexDirection="column"
					height={contentHeight}
					paddingX={4}
					paddingY={2}
				>
					<DetailPanel process={selectedProcess} isLive={true} />
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
