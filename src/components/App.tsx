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
		showCopySuccess,
		selectedPid,
		closeDialog,
	} = useProcessManager();

	let dialogContent = <HelpBar />;

	if (showSession && selectedPid) {
		dialogContent = (
			<SessionViewDialog
				pid={selectedPid}
				visible={showSession}
				onClose={closeDialog}
				showCopySuccess={showCopySuccess}
			/>
		);
	} else if (showDetail && selectedPid) {
		dialogContent = (
			<DetailDialog
				pid={selectedPid}
				visible={showDetail}
				onClose={closeDialog}
			/>
		);
	} else if (showConfirm && selectedPid) {
		dialogContent = <ConfirmDialog pid={selectedPid} visible={showConfirm} />;
	}

	return (
		<Box flexDirection="column">
			<Text dimColor> </Text>

			<Text bold color="cyan">
				Claude Code Peek
			</Text>

			<Text dimColor> </Text>

			<ProcessList processes={processes} selectedIndex={selectedIndex} />

			<Text dimColor> </Text>

			{dialogContent}
		</Box>
	);
}
