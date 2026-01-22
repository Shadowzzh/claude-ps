import { Box, Text } from "ink";
import { COLUMN_WIDTH, getUsageColor } from "../../constants/theme";
import type { EnrichedProcess } from "../../types";
import { formatElapsed, shortenPath } from "../../utils/format";

const PADDING_X = 1;

/** ANSI 背景色代码（使用 terminal 256 色） */
const BG_CODES = {
	reset: "\x1b[49m",
	blue: "\x1b[48;5;24m", // 深蓝背景
	gray: "\x1b[48;5;240m", // 深灰背景
} as const;

/**
 * 包装文本以应用背景色
 */
function withBgColor(text: string, bgColor: keyof typeof BG_CODES): string {
	return `${BG_CODES[bgColor]}${text}${BG_CODES.reset}`;
}

interface ProcessItemProps {
	process: EnrichedProcess;
	isSelected: boolean;
}

/**
 * 单个进程行组件
 * 使用 ANSI 背景色表示选中状态
 * 与 TableHeader 使用相同的对齐方式确保列对齐
 */
export function ProcessItem({ process, isSelected }: ProcessItemProps) {
	// 工作目录颜色
	let cwdColor: string | undefined = undefined;
	if (process.isOrphan) cwdColor = "red";
	else if (process.isCurrent) cwdColor = "green";

	// 固定宽度格式化，与表头对齐
	const pidText = String(process.pid).padEnd(COLUMN_WIDTH.pid);
	const cpuText = `${process.cpu.toFixed(1)}%`.padEnd(COLUMN_WIDTH.cpu);
	const memText = `${process.memory.toFixed(1)}%`.padEnd(COLUMN_WIDTH.memory);
	const elapsedText = formatElapsed(process.elapsed).padEnd(
		COLUMN_WIDTH.elapsed,
	);
	const cwdText = process.cwd;

	// 构建整行文本
	const rowText =
		pidText + cpuText + memText + elapsedText + cwdText + " ".repeat(PADDING_X);

	// 选中时应用背景色
	const displayText = isSelected ? withBgColor(rowText, "blue") : rowText;

	return (
		<Text
			color={isSelected ? undefined : cwdColor}
			dimColor={!isSelected && cwdColor === undefined}
		>
			{displayText}
		</Text>
	);
}
