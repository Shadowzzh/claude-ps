/** CPU/内存使用率颜色阈值 */
export const USAGE_THRESHOLD = {
	LOW: 30,
	HIGH: 70,
} as const;

/** 颜色配置 */
export const COLORS = {
	/** 使用率颜色 */
	usage: {
		low: "green",
		medium: "yellow",
		high: "red",
	},
	/** 标签颜色 */
	label: "gray",
	/** 数值颜色 */
	value: "cyan",
	/** 当前终端进程 */
	current: "green",
	/** 孤儿进程 */
	orphan: "red",
	/** 选中项 */
	selected: "yellow",
	/** 标题 */
	title: "cyan",
} as const;

/** 列宽配置 */
export const COLUMN_WIDTH = {
	prefix: 2,
	pid: 6,
	cpu: 6,
	memory: 6,
	elapsed: 9,
} as const;

/** 假设的系统总内存（MB），用于估算内存使用量 */
export const ESTIMATED_TOTAL_MEMORY_MB = 16 * 1024;

/**
 * 根据使用率百分比获取对应颜色
 * @param percent 使用率百分比
 * @returns 颜色字符串
 */
export function getUsageColor(percent: number): string {
	if (percent < USAGE_THRESHOLD.LOW) return COLORS.usage.low;
	if (percent < USAGE_THRESHOLD.HIGH) return COLORS.usage.medium;
	return COLORS.usage.high;
}
