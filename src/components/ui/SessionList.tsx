import { Box, Text } from "ink";
import { COLORS } from "../../constants/theme";
import type { SessionFile } from "../../types";

interface SessionListProps {
	sessionFiles: SessionFile[];
	selectedIndex: number;
	isFocused: boolean;
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
 * 会话列表组件
 * 显示项目下的所有会话文件
 */
export function SessionList({
	sessionFiles,
	selectedIndex,
	isFocused,
}: SessionListProps) {
	return (
		<Box flexDirection="column">
			<Box paddingBottom={1}>
				<Text bold color="cyan">
					会话文件 ({sessionFiles.length})
				</Text>
				{isFocused && <Text color="yellow"> [焦点]</Text>}
			</Box>

			{sessionFiles.length === 0 ? (
				<Text color={COLORS.label}>无会话文件</Text>
			) : (
				<Box flexDirection="column">
					{sessionFiles.map((file, index) => (
						<Box key={file.fileName} flexDirection="column" paddingBottom={1}>
							<Box flexDirection="row" gap={1}>
								<Text color={index === selectedIndex ? "green" : "gray"}>
									{index === selectedIndex ? "▶" : " "}
								</Text>
								<Text
									bold={index === selectedIndex}
									color={index === selectedIndex ? "white" : "gray"}
									wrap="truncate"
								>
									{file.fileName.replace(".jsonl", "").slice(0, 30)}
								</Text>
							</Box>
							<Box flexDirection="row" paddingLeft={2}>
								<Text color={COLORS.label} dimColor>
									{formatSize(file.size)} · {file.messageCount}条
								</Text>
							</Box>
							<Box flexDirection="row" paddingLeft={2}>
								<Text color={COLORS.label} dimColor>
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
	);
}
