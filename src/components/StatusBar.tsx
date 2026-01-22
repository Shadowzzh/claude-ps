import { Box, Text } from "ink";
import { COLORS, ESTIMATED_TOTAL_MEMORY_MB } from "../constants/theme";
import type { EnrichedProcess } from "../types";

interface StatusBarProps {
	processes: EnrichedProcess[];
}

/**
 * 计算进程汇总统计
 * @param processes 进程列表
 * @returns 汇总统计对象
 */
function calculateStats(processes: EnrichedProcess[]) {
	const totalCpu = processes.reduce((sum, p) => sum + p.cpu, 0);
	const totalMemoryPercent = processes.reduce((sum, p) => sum + p.memory, 0);
	const totalMemoryMB = (totalMemoryPercent / 100) * ESTIMATED_TOTAL_MEMORY_MB;
	const orphanCount = processes.filter((p) => p.isOrphan).length;
	const currentCount = processes.filter((p) => p.isCurrent).length;

	return {
		count: processes.length,
		totalCpu,
		totalMemory:
			totalMemoryMB < 1024
				? `${Math.round(totalMemoryMB)}MB`
				: `${(totalMemoryMB / 1024).toFixed(1)}GB`,
		orphanCount,
		currentCount,
	};
}

/**
 * 状态栏组件
 * 显示进程汇总信息：总数、CPU、内存、孤儿进程数、当前终端进程数
 */
export function StatusBar({ processes }: StatusBarProps) {
	const stats = calculateStats(processes);

	return (
		<Box>
			<Text color={COLORS.label}>进程: </Text>
			<Text color={COLORS.value}>{stats.count}</Text>
			<Text color={COLORS.label}> | CPU: </Text>
			<Text color={COLORS.value}>{stats.totalCpu.toFixed(1)}%</Text>
			<Text color={COLORS.label}> | 内存: </Text>
			<Text color={COLORS.value}>{stats.totalMemory}</Text>
			<Text color={COLORS.label}> | 孤儿: </Text>
			<Text color={stats.orphanCount > 0 ? COLORS.orphan : COLORS.value}>
				{stats.orphanCount}
			</Text>
			<Text color={COLORS.label}> | 当前: </Text>
			<Text color={stats.currentCount > 0 ? COLORS.current : COLORS.value}>
				{stats.currentCount}
			</Text>
		</Box>
	);
}
