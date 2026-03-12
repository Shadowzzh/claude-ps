import { useApp, useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import { getClaudeProcesses, killProcess } from "../lib/process.js";
import type { ProcessInfo } from "../types.js";

export function useProcessManager() {
	const [processes, setProcesses] = useState<ProcessInfo[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [showConfirm, setShowConfirm] = useState(false);
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
		if (showConfirm) {
			if (input === "y" || input === "Y") {
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
			setSelectedIndex((i) => Math.max(0, i - 1));
		} else if (key.downArrow || input === "j") {
			setSelectedIndex((i) => Math.min(processes.length - 1, i + 1));
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
		selectedProcess: processes[selectedIndex],
	};
}
