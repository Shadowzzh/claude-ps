import { Box, Text } from "ink";
import { COLORS } from "../../constants/theme";
import type { EnrichedProcess, SessionFile } from "../../types";
import { formatElapsed, formatMemory } from "../../utils/format";
import { EmptyPrompt, InfoRow, Section } from "./primitives";

interface DetailPanelProps {
	process: EnrichedProcess | null;
	isLive?: boolean;
	contentHeight: number;
	isFocused?: boolean;
	selectedSessionIndex: number;
}

/**
 * 格式化文件大小
 */
function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHour = Math.floor(diffMin / 60);
	const diffDay = Math.floor(diffHour / 24);

	if (diffSec < 60) return `${diffSec}秒前`;
	if (diffMin < 60) return `${diffMin}分钟前`;
	if (diffHour < 24) return `${diffHour}小时前`;
	return `${diffDay}天前`;
}

/**
 * 详情面板组件
 * 显示选中进程的资源信息和所有会话文件列表
 */
export function DetailPanel({
	process: proc,
	isLive = true,
	contentHeight,
	isFocused = false,
	selectedSessionIndex,
}: DetailPanelProps) {
	if (!proc) {
		return <EmptyPrompt message="选择一个进程查看详情" />;
	}

	const sessionFiles = proc.sessionFiles;
	const selectedSession = sessionFiles[selectedSessionIndex] || null;

	return (
		<Box flexDirection="column">
			{/* 资源信息 */}
			<Section title="资源信息">
				<InfoRow label="CPU" value={`${proc.cpu.toFixed(1)}%`} />
				<InfoRow label="内存" value={formatMemory(proc.memory)} />
				<InfoRow label="时长" value={formatElapsed(proc.elapsed)} />
			</Section>

			{/* 会话文件列表 */}
			<Box flexDirection="column" paddingTop={1}>
				<Text bold color="cyan">
					会话文件 ({sessionFiles.length})
				</Text>
				<Text> </Text>

				{sessionFiles.length === 0 ? (
					<Text color={COLORS.label}>无会话文件</Text>
				) : (
					<Box flexDirection="column">
						{sessionFiles.map((file, index) => (
							<Box key={file.fileName} flexDirection="column" paddingBottom={1}>
								<Box flexDirection="row" gap={1}>
									<Text color={index === selectedSessionIndex ? "green" : "gray"}>
										{index === selectedSessionIndex ? "▶" : " "}
									</Text>
									<Text
										bold={index === selectedSessionIndex}
										color={index === selectedSessionIndex ? "white" : "gray"}
									>
										{file.fileName.replace(".jsonl", "")}
									</Text>
								</Box>
								<Box flexDirection="row" paddingLeft={2}>
									<Text color={COLORS.label}>
										{formatSize(file.size)} · {file.messageCount}条消息 ·{" "}
										{file.lastMessageTime
											? formatRelativeTime(file.lastMessageTime)
											: "无活动"}
									</Text>
								</Box>
							</Box>
						))}
					</Box>
				)}
			</Box>

			{/* 选中会话的最近消息 */}
			{selectedSession && selectedSession.recentMessages.length > 0 && (
				<Box flexDirection="column" paddingTop={1}>
					<Text bold color="cyan">
						最近消息
					</Text>
					<Text> </Text>
					{selectedSession.recentMessages.map((msg, idx) => (
						<Box key={idx} flexDirection="column" paddingBottom={1}>
							<Text color={msg.role === "user" ? COLORS.current : "blue"}>
								{msg.role === "user" ? "[User]" : "[Claude]"}
							</Text>
							<Text color={COLORS.label} wrap="truncate">
								{msg.content}
							</Text>
						</Box>
					))}
				</Box>
			)}
		</Box>
	);
}
