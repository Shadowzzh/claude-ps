import { Box, Text } from "ink";
import type React from "react";
import { useMemo } from "react";
import { calculateStats, parseSessionMessages } from "../lib/sessionParser.js";
import type { MessageContent, ProcessInfo, SessionMessage } from "../types.js";

interface SessionViewDialogProps {
	proc: ProcessInfo;
	visible: boolean;
}

function formatTime(isoString: string): string {
	return new Date(isoString).toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
}

function formatDuration(start: string, end: string): string {
	const duration = new Date(end).getTime() - new Date(start).getTime();
	const minutes = Math.floor(duration / 60000);
	const seconds = Math.floor((duration % 60000) / 1000);
	return `${minutes} 分 ${seconds} 秒`;
}

function renderMessageContent(
	content: string | MessageContent[],
	showThinking: boolean,
	showTools: boolean,
): React.ReactNode[] {
	const elements: React.ReactNode[] = [];

	if (typeof content === "string") {
		elements.push(<Text key="text">{content}</Text>);
		return elements;
	}

	if (Array.isArray(content)) {
		content.forEach((item, idx) => {
			if (item.type === "text" && item.text) {
				elements.push(
					<Text key={`text-${idx}-${item.text.substring(0, 20)}`}>
						{item.text}
					</Text>,
				);
			} else if (item.type === "thinking" && showThinking && item.thinking) {
				const thinkingText =
					item.thinking.length > 100
						? `${item.thinking.substring(0, 100)}...`
						: item.thinking;
				elements.push(
					<Text
						key={`thinking-${idx}-${item.thinking.substring(0, 20)}`}
						color="yellow"
					>
						[THINKING] {thinkingText}
					</Text>,
				);
			} else if (item.type === "tool_use" && showTools && item.name) {
				const params = item.input
					? ` ${JSON.stringify(item.input).substring(0, 100)}`
					: "";
				elements.push(
					<Text key={`tool-${idx}-${item.name}`} color="cyan">
						[TOOL] {item.name}
						{params}
					</Text>,
				);
			} else if (item.type === "tool_result" && showTools) {
				const resultContent =
					typeof item.content === "string"
						? item.content.substring(0, 200)
						: JSON.stringify(item.content).substring(0, 200);
				elements.push(
					<Text key={`result-${item.tool_use_id || idx}`} dimColor>
						{resultContent}
						{resultContent.length >= 200 ? "..." : ""}
					</Text>,
				);
			}
		});
	}

	return elements;
}

export function SessionViewDialog({ proc, visible }: SessionViewDialogProps) {
	const messages = useMemo(() => {
		if (!proc.session) return [];
		return parseSessionMessages(proc.cwd, proc.session.sessionId);
	}, [proc.cwd, proc.session]);

	const stats = useMemo(() => calculateStats(messages), [messages]);

	if (!visible || !proc.session) return null;

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
			padding={1}
		>
			<Text bold color="cyan">
				会话对话 - {proc.session.summary.substring(0, 50)}
			</Text>
			<Text dimColor> </Text>

			<Box
				flexDirection="column"
				borderStyle="single"
				borderColor="gray"
				paddingX={1}
			>
				<Text>
					<Text bold>消息:</Text> {stats.totalMessages} (用户:{" "}
					{stats.userMessages}, AI: {stats.assistantMessages})
				</Text>
				<Text>
					<Text bold>Token:</Text> 输入{" "}
					{stats.totalInputTokens.toLocaleString()} / 输出{" "}
					{stats.totalOutputTokens.toLocaleString()}
				</Text>
				{stats.startTime && stats.endTime && (
					<Text>
						<Text bold>对话时长:</Text>{" "}
						{formatDuration(stats.startTime, stats.endTime)}
					</Text>
				)}
				{stats.thinkingCount > 0 && (
					<Text>
						<Text bold>思考:</Text> {stats.thinkingCount} 次
					</Text>
				)}
				{Object.keys(stats.toolCalls).length > 0 && (
					<Text>
						<Text bold>工具:</Text>{" "}
						{Object.entries(stats.toolCalls)
							.map(([name, count]) => `${name}(${count})`)
							.join(", ")}
					</Text>
				)}
			</Box>

			<Text dimColor> </Text>
			<Text bold color="magenta">
				对话历史 (共 {messages.length} 条):
			</Text>
			<Text dimColor> </Text>

			<Box flexDirection="column">
				{messages.map((msg) => {
					const isToolResult =
						Array.isArray(msg.message?.content) &&
						msg.message.content.some((item) => item.type === "tool_result");

					let roleLabel: string;
					let roleColor: string;

					if (isToolResult) {
						roleLabel = "TOOL_RESULT";
						roleColor = "magenta";
					} else if (msg.type === "user") {
						roleLabel = "USER";
						roleColor = "green";
					} else {
						roleLabel = "AI";
						roleColor = "blue";
					}

					return (
						<Box key={msg.timestamp} flexDirection="column" marginBottom={1}>
							<Text color={roleColor}>
								[{roleLabel}] {formatTime(msg.timestamp)}
							</Text>
							{msg.message?.content &&
								renderMessageContent(msg.message.content, true, true)}
						</Box>
					);
				})}
			</Box>

			<Text dimColor> </Text>
			<Text dimColor>按 ESC 或 Enter 关闭</Text>
		</Box>
	);
}
