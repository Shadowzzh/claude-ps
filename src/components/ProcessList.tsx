import { Box, Text } from "ink";
import { COLORS, COLUMN_WIDTH, getUsageColor } from "../constants/theme";
import type { EnrichedProcess } from "../types";
import { formatElapsed, shortenPath } from "../utils/format";

interface ProcessListProps {
	processes: EnrichedProcess[];
	selectedIndex: number;
	loading: boolean;
}

/**
 * 格式化百分比显示，固定宽度右对齐
 * @param value 百分比值
 * @param width 固定宽度
 * @returns 格式化字符串
 */
function formatPercent(value: number, width: number): string {
	const str = `${value.toFixed(1)}%`;
	return str.padStart(width);
}

/**
 * 进程列表组件
 * 显示所有 Claude 进程的 PID、CPU、内存、时长和工作目录
 */
export function ProcessList({
	processes,
	selectedIndex,
	loading,
}: ProcessListProps) {
	if (loading) {
		return (
			<Box flexDirection="column">
				<Text color="gray">加载中...</Text>
			</Box>
		);
	}

	if (processes.length === 0) {
		return (
			<Box flexDirection="column">
				<Text color="gray">无运行中的 Claude 进程</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			{/* 表头 */}
			<Box>
				<Text bold color={COLORS.title}>
					{"  "}
				</Text>
				<Box width={COLUMN_WIDTH.pid}>
					<Text bold color={COLORS.title}>
						PID
					</Text>
				</Box>
				<Box width={COLUMN_WIDTH.cpu}>
					<Text bold color={COLORS.title}>
						CPU
					</Text>
				</Box>
				<Box width={COLUMN_WIDTH.memory}>
					<Text bold color={COLORS.title}>
						MEM
					</Text>
				</Box>
				<Box width={COLUMN_WIDTH.elapsed}>
					<Text bold color={COLORS.title}>
						时长
					</Text>
				</Box>
				<Text bold color={COLORS.title}>
					工作目录
				</Text>
			</Box>

			{/* 分隔线 */}
			<Text color="gray">{"─".repeat(60)}</Text>

			{/* 进程列表 */}
			{processes.map((proc, index) => {
				const isSelected = index === selectedIndex;
				const prefix = isSelected ? "▶ " : "   ";

				// 工作目录颜色
				let cwdColor: string | undefined = undefined;
				if (proc.isOrphan) cwdColor = COLORS.orphan;
				else if (proc.isCurrent) cwdColor = COLORS.current;

				return (
					<Box key={proc.pid}>
						<Text color={isSelected ? COLORS.selected : undefined}>
							{prefix}
						</Text>
						<Box width={COLUMN_WIDTH.pid}>
							<Text color={isSelected ? COLORS.selected : undefined}>
								{proc.pid}
							</Text>
						</Box>
						<Box width={COLUMN_WIDTH.cpu}>
							<Text color={getUsageColor(proc.cpu)}>
								{formatPercent(proc.cpu, COLUMN_WIDTH.cpu - 1)}
							</Text>
						</Box>
						<Box width={COLUMN_WIDTH.memory}>
							<Text color={getUsageColor(proc.memory)}>
								{formatPercent(proc.memory, COLUMN_WIDTH.memory - 1)}
							</Text>
						</Box>
						<Box width={COLUMN_WIDTH.elapsed}>
							<Text color={isSelected ? COLORS.selected : "gray"}>
								{formatElapsed(proc.elapsed).slice(0, COLUMN_WIDTH.elapsed - 1)}
							</Text>
						</Box>
						<Text color={cwdColor}>
							{shortenPath(proc.cwd, 30)}
							{proc.isCurrent ? " ●" : ""}
						</Text>
					</Box>
				);
			})}
		</Box>
	);
}
