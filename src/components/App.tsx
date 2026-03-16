import { Box, Text } from "ink";
import React from "react";
import { useProcessManager } from "../hooks/useProcessManager.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { DetailDialog } from "./DetailDialog.js";
import { HelpBar } from "./HelpBar.js";
import { ProcessList } from "./ProcessList.js";
import { SessionViewDialog } from "./SessionViewDialog.js";

export function App() {
	const {
		processes,
		selectedIndex,
		showConfirm,
		showDetail,
		showSession,
		selectedProcess,
	} = useProcessManager();

	return (
		<Box flexDirection="column">
			<Text dimColor> </Text>

			<Text bold color="cyan">
				Claude Code Peek
			</Text>

			<Text dimColor> </Text>

			<ProcessList processes={processes} selectedIndex={selectedIndex} />

			<Text dimColor> </Text>

			{showSession && selectedProcess ? (
				<SessionViewDialog proc={selectedProcess} visible={showSession} />
			) : showDetail && selectedProcess ? (
				<DetailDialog proc={selectedProcess} visible={showDetail} />
			) : showConfirm && selectedProcess ? (
				<ConfirmDialog pid={selectedProcess.pid} visible={showConfirm} />
			) : (
				<HelpBar />
			)}
		</Box>
	);
}
