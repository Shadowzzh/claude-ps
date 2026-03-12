import { Box, Text } from "ink";
import { COLORS } from "../../constants/theme";
import type { SessionFile } from "../../types";

interface MessageDetailProps {
	sessionFile: SessionFile | null;
	isFocused: boolean;
}

/**
 * 消息详情组件
 * 显示选中会话的消息内容
 */
export function MessageDetail({ sessionFile, isFocused }: MessageDetailProps) {
	if (!sessionFile) {
		return (
			<Box flexDirection="column">
				<Text color={COLORS.label}>选择一个会话查看消息</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Box paddingBottom={1}>
				<Text bold color="cyan">
					消息详情
				</Text>
				{isFocused && <Text color="yellow"> [焦点]</Text>}
			</Box>

			{sessionFile.recentMessages.length === 0 ? (
				<Text color={COLORS.label}>无消息记录</Text>
			) : (
				<Box flexDirection="column">
					{sessionFile.recentMessages.map((msg, idx) => (
						<Box key={idx} flexDirection="column" paddingBottom={1}>
							<Text
								bold
								color={msg.role === "user" ? COLORS.current : "blue"}
							>
								{msg.role === "user" ? "[User]" : "[Claude]"}
							</Text>
							<Text wrap="wrap">{msg.content}</Text>
						</Box>
					))}
				</Box>
			)}
		</Box>
	);
}
