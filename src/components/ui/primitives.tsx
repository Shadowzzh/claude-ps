import { Box, Text } from "ink";
import type { ReactNode } from "react";

/**
 * 分隔线组件
 */
export function Separator({
	char = "─",
	length = 60,
}: { char?: string; length?: number }) {
	return <Text color="gray">{char.repeat(length)}</Text>;
}

/**
 * 空状态提示组件
 */
export function EmptyPrompt({ message }: { message: string }) {
	return (
		<Box paddingX={1}>
			<Text color="gray">{message}</Text>
		</Box>
	);
}

/**
 * 加载状态组件
 */
export function LoadingState({ message = "加载中..." }: { message?: string }) {
	return (
		<Box paddingX={1}>
			<Text color="gray">{message}</Text>
		</Box>
	);
}

/**
 * 信息行组件 (label: value)
 */
export function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<Box>
			<Text color="cyan">{label}: </Text>
			<Text>{value}</Text>
		</Box>
	);
}

/**
 * 分区组件（带标题的内容块）
 */
export function Section({
	title,
	children,
}: { title: string; children: ReactNode }) {
	return (
		<Box flexDirection="column">
			<Text bold color="cyan">
				{title}
			</Text>
			{children}
		</Box>
	);
}

/**
 * 键盘快捷键提示组件
 */
export function KeyHint({
	shortcut,
	desc,
}: { shortcut: string; desc: string }) {
	return (
		<Text>
			<Text color="blue">{shortcut}</Text>
			<Text color="gray"> {desc}</Text>
		</Text>
	);
}
