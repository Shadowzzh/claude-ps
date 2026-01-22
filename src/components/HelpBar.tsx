import { Box, Text } from "ink";
import React from "react";
import { COLORS } from "../constants/theme";
import type { SortField } from "../types";

interface HelpBarProps {
	processCount: number;
	interval: number;
	sortField: SortField;
}

interface KeyHint {
	key: string;
	desc: string;
}

/** 快捷键提示配置 */
const hints: KeyHint[] = [
	{ key: "↑/↓", desc: "移动" },
	{ key: "d", desc: "终止" },
	{ key: "D", desc: "强杀" },
	{ key: "s", desc: "排序" },
	{ key: "r", desc: "刷新" },
	{ key: "q", desc: "退出" },
];

/** 排序字段显示名称 */
const sortFieldLabels: Record<SortField, string> = {
	cpu: "CPU",
	memory: "内存",
	elapsed: "时长",
	default: "PID",
};

/**
 * 底部帮助栏组件
 * 显示快捷键提示、进程数量、刷新间隔和当前排序方式
 */
export function HelpBar({ processCount, interval, sortField }: HelpBarProps) {
	return (
		<Box justifyContent="space-between">
			<Box>
				{hints.map((hint, i) => (
					<React.Fragment key={hint.key}>
						<Text color={COLORS.selected}>{hint.key}</Text>
						<Text color={COLORS.label}> {hint.desc}</Text>
						{i < hints.length - 1 && <Text> </Text>}
					</React.Fragment>
				))}
			</Box>
			<Box>
				<Text color={COLORS.value}>{processCount} 进程</Text>
				<Text color={COLORS.label}> | </Text>
				<Text color={COLORS.label}>排序: </Text>
				<Text color={COLORS.value}>{sortFieldLabels[sortField]}</Text>
				<Text color={COLORS.label}> | </Text>
				<Text color={COLORS.label}>刷新: {interval}s</Text>
			</Box>
		</Box>
	);
}
