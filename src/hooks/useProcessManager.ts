import { useApp, useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import { getClaudeProcesses, killProcess } from "../lib/process.js";
import type { ProcessInfo } from "../types.js";

export function useProcessManager() {
	const [processes, setProcesses] = useState<ProcessInfo[]>([]);
	const [selectedPid, setSelectedPid] = useState<number | null>(null);
	const [showConfirm, setShowConfirm] = useState(false);
	const [showDetail, setShowDetail] = useState(false);
	const [showSession, setShowSession] = useState(false);
	const { exit } = useApp();

	const moveSelection = useCallback(
		(direction: "up" | "down") => {
			setSelectedPid((pid) => {
				const idx = processes.findIndex((p) => p.pid === pid);
				const offset = direction === "up" ? -1 : 1;
				const newIdx = (idx + offset + processes.length) % processes.length;
				return processes[newIdx]?.pid || pid;
			});
		},
		[processes],
	);

	const loadProcesses = useCallback(() => {
		const procs = getClaudeProcesses();
		setProcesses(procs);

		setSelectedPid((prev) => {
			if (!prev && procs.length > 0) return procs[0].pid;
			if (procs.some((p) => p.pid === prev)) return prev;
			return procs.length > 0 ? procs[0].pid : null;
		});
	}, []);

	useEffect(() => {
		loadProcesses();
		const interval = setInterval(loadProcesses, 3000);
		return () => clearInterval(interval);
	}, [loadProcesses]);

	useInput((input, key) => {
		if (showSession) {
			if (key.escape || key.return) {
				setShowSession(false);
			}
			return;
		}

		if (showDetail) {
			if (key.upArrow) {
				moveSelection("up");
			} else if (key.downArrow) {
				moveSelection("down");
			} else if (key.escape || input === "v") {
				setShowDetail(false);
			}
			return;
		}

		if (showConfirm) {
			if (input === "y" || input === "Y" || key.return) {
				if (selectedPid) {
					killProcess(selectedPid);
					setTimeout(loadProcesses, 100);
				}
				setShowConfirm(false);
			} else if (input === "n" || input === "N" || key.escape) {
				setShowConfirm(false);
			}
			return;
		}

		if (key.upArrow || input === "k") {
			moveSelection("up");
		} else if (key.downArrow || input === "j") {
			moveSelection("down");
		} else if (key.return && processes.length > 0) {
			setShowSession(true);
		} else if (input === "v" && processes.length > 0) {
			setShowDetail(true);
		} else if (input === "d" && processes.length > 0) {
			setShowConfirm(true);
		} else if (input === "r") {
			loadProcesses();
		} else if (input === "q" || key.escape) {
			exit();
		}
	});

	const selectedIndex = processes.findIndex((p) => p.pid === selectedPid);

	return {
		processes,
		selectedIndex: selectedIndex >= 0 ? selectedIndex : 0,
		showConfirm,
		showDetail,
		showSession,
		selectedPid: selectedPid || undefined,
		closeDialog: useCallback(() => {
			setShowSession(false);
			setShowDetail(false);
			setShowConfirm(false);
		}, []),
	};
}
