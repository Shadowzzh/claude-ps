import { Box, Text } from "ink";
import { COLORS } from "../../constants/theme";
import type { EnrichedProcess } from "../../types";
import { formatElapsed, formatMemory } from "../../utils/format";
import { EmptyPrompt, InfoRow, Section } from "./primitives";

interface DetailPanelProps {
	process: EnrichedProcess | null;
	isLive?: boolean;
}

/**
 * 详情面板组件
 * 显示选中进程的 CPU、内存、会话信息和最近对话
 */
export function DetailPanel({
	process: proc,
	isLive = true,
}: DetailPanelProps) {
	if (!proc) {
		return <EmptyPrompt message="选择一个进程查看详情" />;
	}

	return (
		<Box flexDirection="column">
			{/* 基本信息 */}
			<Section title="资源信息">
				<InfoRow label="CPU" value={`${proc.cpu.toFixed(1)}%`} />
				<InfoRow label="内存" value={formatMemory(proc.memory)} />
				<InfoRow label="时长" value={formatElapsed(proc.elapsed)} />
			</Section>

			{/* 会话文件 */}
			<Box flexDirection="column" paddingBottom={1}>
				<Text> </Text>
				<Text bold color="cyan">
					Session:
				</Text>
				<Text color={COLORS.label} wrap="truncate">
					{proc.sessionPath || "无会话文件"}
				</Text>
			</Box>

			<Box paddingBottom={1} flexDirection="row" gap={1}>
				<Text bold color="cyan">
					最近对话
				</Text>
				{isLive && proc.sessionPath && <Text color="green">● 实时</Text>}
			</Box>

			{/* 最近对话 */}
			<Box flexDirection="column">
				{proc.messages.length === 0 ? (
					<Text color={COLORS.label}>无对话记录</Text>
				) : (
					proc.messages.map((msg) => (
						<Box key={msg.timestamp} flexDirection="row">
							<Text color={msg.role === "user" ? COLORS.current : "blue"}>
								{msg.role === "user" ? "[User]" : "[Claude]"}{" "}
							</Text>
							<Text wrap="truncate">{msg.content}</Text>
						</Box>
					))
				)}
			</Box>
		</Box>
	);
}
