import { Box, Text } from "ink";
import React from "react";
import { useProcessManager } from "../hooks/useProcessManager.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { HelpBar } from "./HelpBar.js";
import { ProcessList } from "./ProcessList.js";

export function App() {
	const { processes, selectedIndex, showConfirm, selectedProcess } =
		useProcessManager();

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				Claude Code 进程管理器
			</Text>
			<Text dimColor> </Text>

			<ProcessList processes={processes} selectedIndex={selectedIndex} />

			<Text dimColor> </Text>

			{showConfirm && selectedProcess ? (
				<ConfirmDialog pid={selectedProcess.pid} visible={showConfirm} />
			) : (
				<HelpBar />
			)}
		</Box>
	);
}
