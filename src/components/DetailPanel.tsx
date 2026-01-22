import { Box, Text } from "ink";
import { COLORS } from "../constants/theme";
import type { EnrichedProcess } from "../types";
import { formatElapsed, formatMemory } from "../utils/format";

interface DetailPanelProps {
	process: EnrichedProcess | null;
}

/**
 * 详情面板组件
 * 显示选中进程的 CPU、内存、会话信息和最近对话
 */
export function DetailPanel({ process: proc }: DetailPanelProps) {
	if (!proc) {
		return (
			<Box flexDirection="column" paddingLeft={1}>
				<Text color={COLORS.label}>选择一个进程查看详情</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" paddingLeft={1}>
			{/* 基本信息 */}
			<Box>
				<Text color={COLORS.title}>CPU: </Text>
				<Text>{proc.cpu.toFixed(1)}%</Text>
				<Text> </Text>
				<Text color={COLORS.title}>内存: </Text>
				<Text>{formatMemory(proc.memory)}</Text>
				<Text> </Text>
				<Text color={COLORS.title}>时长: </Text>
				<Text>{formatElapsed(proc.elapsed)}</Text>
			</Box>

			<Text> </Text>

			{/* 会话文件 */}
			<Box flexDirection="column">
				<Text color={COLORS.title}>Session:</Text>
				<Text color={COLORS.label} wrap="truncate">
					{proc.sessionPath || "无会话文件"}
				</Text>
			</Box>

			<Text> </Text>

			{/* 最近对话 */}
			<Text color={COLORS.title} bold>
				─ 最近对话 ─
			</Text>

			{proc.messages.length === 0 ? (
				<Text color={COLORS.label}>无对话记录</Text>
			) : (
				proc.messages.map((msg) => (
					<Box key={msg.timestamp} flexDirection="row">
						<Text color={msg.role === "user" ? COLORS.current : "blue"}>
							[{msg.role === "user" ? "User" : "Claude"}]{" "}
						</Text>
						<Text wrap="truncate">{msg.content}</Text>
					</Box>
				))
			)}
		</Box>
	);
}
