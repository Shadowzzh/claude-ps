import { ESTIMATED_TOTAL_MEMORY_MB } from "../constants/theme";

/**
 * 格式化内存显示
 * 将内存百分比转换为 MB/GB 显示
 * @param memPercent 内存使用百分比
 * @returns 格式化的内存字符串，如 "156MB" 或 "1.2GB"
 */
export function formatMemory(memPercent: number): string {
	const usedMB = (memPercent / 100) * ESTIMATED_TOTAL_MEMORY_MB;
	if (usedMB < 1024) return `${Math.round(usedMB)}MB`;
	return `${(usedMB / 1024).toFixed(1)}GB`;
}

/**
 * 格式化运行时长为可读格式
 * @param elapsed ps 输出的时间格式 [[DD-]HH:]MM:SS
 * @returns 可读格式，如 "1时23分" 或 "2天3时"
 */
export function formatElapsed(elapsed: string): string {
	if (!elapsed) return "未知";
	const parts = elapsed.split(/[-:]/);

	if (parts.length === 2) {
		return `${parts[0]}分${parts[1]}秒`;
	}
	if (parts.length === 3) {
		return `${parts[0]}时${parts[1]}分`;
	}
	if (parts.length === 4) {
		return `${parts[0]}天${parts[1]}时`;
	}
	return elapsed;
}

/**
 * 缩短路径显示
 * 将 home 目录替换为 ~，过长路径截断中间部分
 * @param inputPath 原始路径
 * @param maxLen 最大显示长度，默认 25
 * @returns 缩短后的路径
 */
export function shortenPath(inputPath: string, maxLen = 25): string {
	let path = inputPath;

	// 尝试用 ~ 替换 home 目录
	const home = process.env.HOME || "";
	if (home && path.startsWith(home)) {
		path = `~${path.slice(home.length)}`;
	}

	if (path.length <= maxLen) return path;

	// 截断中间
	const half = Math.floor((maxLen - 3) / 2);
	return `${path.slice(0, half)}...${path.slice(-half)}`;
}

/**
 * 格式化 CPU 百分比显示
 * @param cpu CPU 使用率
 * @returns 格式化字符串，如 "12.3%"
 */
export function formatCpu(cpu: number): string {
	return `${cpu.toFixed(1)}%`;
}

/**
 * 格式化内存百分比显示
 * @param memory 内存使用率
 * @returns 格式化字符串，如 "2.1%"
 */
export function formatMemoryPercent(memory: number): string {
	return `${memory.toFixed(1)}%`;
}
