import { useApp, useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import { getClaudeProcesses, killProcess } from "../lib/process.js";
import type { ProcessInfo } from "../types.js";

export function useProcessManager() {
	const [processes, setProcesses] = useState<ProcessInfo[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [showConfirm, setShowConfirm] = useState(false);
	const [showDetail, setShowDetail] = useState(false);
	const { exit } = useApp();

	const loadProcesses = useCallback(() => {
		const procs = getClaudeProcesses();
		setProcesses(procs);
		setSelectedIndex((prev) =>
			prev >= procs.length && procs.length > 0 ? procs.length - 1 : prev,
		);
	}, []);

	// 初始加载和自动刷新
	useEffect(() => {
		loadProcesses();
		const interval = setInterval(loadProcesses, 3000);
		return () => clearInterval(interval);
	}, [loadProcesses]);

	// 键盘事件
	useInput((input, key) => {
		if (showDetail) {
			if (key.upArrow) {
				setSelectedIndex((i) => (i - 1 + processes.length) % processes.length);
			} else if (key.downArrow) {
				setSelectedIndex((i) => (i + 1) % processes.length);
			} else if (key.escape || input === "v") {
				setShowDetail(false);
			}
			return;
		}

		if (showConfirm) {
			if (input === "y" || input === "Y" || key.return) {
				const proc = processes[selectedIndex];
				if (proc) {
					killProcess(proc.pid);
					setTimeout(loadProcesses, 100);
				}
				setShowConfirm(false);
			} else if (input === "n" || input === "N" || key.escape) {
				setShowConfirm(false);
			}
			return;
		}

		if (key.upArrow || input === "k") {
			setSelectedIndex((i) => (i - 1 + processes.length) % processes.length);
		} else if (key.downArrow || input === "j") {
			setSelectedIndex((i) => (i + 1) % processes.length);
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

	return {
		processes,
		selectedIndex,
		showConfirm,
		showDetail,
		selectedProcess: processes[selectedIndex],
	};
}
