import { Box, Text } from "ink";
import React from "react";
import type { ProcessInfo } from "../types.js";

interface DetailDialogProps {
	proc: ProcessInfo;
	visible: boolean;
}

export function DetailDialog({ proc, visible }: DetailDialogProps) {
	if (!visible) return null;

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
			padding={1}
		>
			<Text bold color="cyan">
				进程详情
			</Text>
			<Text dimColor> </Text>

			<Text>
				<Text bold>PID:</Text> {proc.pid}
			</Text>
			<Text>
				<Text bold>CPU:</Text> {proc.cpu}
			</Text>
			<Text>
				<Text bold>内存:</Text> {proc.mem}
			</Text>
			<Text>
				<Text bold>运行时长:</Text> {proc.etime}
			</Text>
			<Text>
				<Text bold>项目名:</Text> {proc.projectName}
			</Text>
			<Text>
				<Text bold>完整路径:</Text> {proc.cwd}
			</Text>
			<Text>
				<Text bold>Claude 项目路径:</Text> {proc.claudeProjectPath}
			</Text>

			<Text dimColor> </Text>
			<Text bold color="cyan">
				会话信息
			</Text>
			<Text dimColor> </Text>

			{proc.session ? (
				<>
					<Text>
						<Text bold>会话名称:</Text> {proc.session.summary}
					</Text>
					<Text>
						<Text bold>消息数:</Text> {proc.session.messageCount}
					</Text>
					<Text>
						<Text bold>创建时间:</Text>{" "}
						{new Date(proc.session.created).toLocaleString()}
					</Text>
					<Text>
						<Text bold>修改时间:</Text>{" "}
						{new Date(proc.session.modified).toLocaleString()}
					</Text>
				</>
			) : (
				<Text color="yellow">未找到会话信息</Text>
			)}

			<Text dimColor> </Text>
			<Text dimColor>按 ESC 或 v 关闭</Text>
		</Box>
	);
}
