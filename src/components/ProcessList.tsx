import { Box, Text } from "ink";
import { COLORS, COLUMN_WIDTH } from "../constants/theme";
import type { EnrichedProcess } from "../types";
import { ProcessItem } from "./ui/ProcessItem";
import { EmptyPrompt, LoadingState, Separator } from "./ui/primitives";

interface ProcessListProps {
	processes: EnrichedProcess[];
	selectedIndex: number;
	loading: boolean;
	leftWidth: number;
}

/**
 * 表头组件
 * 与 ProcessItem 使用相同的对齐方式确保列对齐
 */
function TableHeader() {
	return (
		<Text bold color={COLORS.title}>
			{"PID".padEnd(COLUMN_WIDTH.pid)}
			{"CPU".padEnd(COLUMN_WIDTH.cpu)}
			{"MEM".padEnd(COLUMN_WIDTH.memory)}
			{"时长".padEnd(COLUMN_WIDTH.elapsed)}
			{"工作目录"}
		</Text>
	);
}

/**
 * 进程列表组件
 * 显示所有 Claude 进程的 PID、CPU、内存、时长和工作目录
 * 使用整行背景色表示选中状态
 */
export function ProcessList({
	processes,
	selectedIndex,
	loading,
	leftWidth,
}: ProcessListProps) {
	if (loading) {
		return <LoadingState message="加载中..." />;
	}

	if (processes.length === 0) {
		return <EmptyPrompt message="无运行中的 Claude 进程" />;
	}

	return (
		<Box flexDirection="column">
			<TableHeader />
			<Separator char="─" length={leftWidth - 12} />
			{processes.map((proc, index) => (
				<ProcessItem
					key={proc.pid}
					process={proc}
					isSelected={index === selectedIndex}
				/>
			))}
		</Box>
	);
}
