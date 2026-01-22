import { useCallback, useEffect, useMemo, useState } from "react";
import type { EnrichedProcess, SortField, UseProcessesReturn } from "../types";
import { getClaudeProcesses, killProcess } from "../utils/process";
import { getRecentMessages, getSessionPath } from "../utils/session";

/**
 * 对进程列表进行排序
 * @param processes 原始进程列表
 * @param sortField 排序字段
 * @returns 排序后的进程列表
 */
function sortProcesses(
	processes: EnrichedProcess[],
	sortField: SortField,
): EnrichedProcess[] {
	const sorted = [...processes];

	switch (sortField) {
		case "cpu":
			sorted.sort((a, b) => b.cpu - a.cpu);
			break;
		case "memory":
			sorted.sort((a, b) => b.memory - a.memory);
			break;
		case "elapsed":
			// 按启动时间升序（越早启动排越前，即运行时间越长）
			sorted.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
			break;
		default:
			// 默认按 PID 升序
			sorted.sort((a, b) => a.pid - b.pid);
	}

	return sorted;
}

/**
 * 进程管理 Hook
 * 提供进程列表、选择、刷新、排序、终止等功能
 * @param interval 自动刷新间隔（秒）
 * @returns 进程状态和操作方法
 */
export function useProcesses(interval: number): UseProcessesReturn {
	const [rawProcesses, setRawProcesses] = useState<EnrichedProcess[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [sortField, setSortField] = useState<SortField>("default");

	/**
	 * 刷新进程列表
	 * 获取所有 Claude 进程并加载其会话信息
	 */
	const refresh = useCallback(async () => {
		try {
			const procs = await getClaudeProcesses();

			// 并行获取所有会话信息
			const enriched = await Promise.all(
				procs.map(async (proc) => {
					const sessionPath = await getSessionPath(proc.cwd, proc.startTime);
					const messages = await getRecentMessages(sessionPath);
					return {
						...proc,
						sessionPath,
						messages,
					};
				}),
			);

			setRawProcesses(enriched);
			setError(null);

			// 保持选中索引在范围内
			setSelectedIndex((prev) =>
				Math.min(prev, Math.max(0, enriched.length - 1)),
			);
		} catch (e) {
			setError(e instanceof Error ? e.message : "未知错误");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
		const timer = setInterval(refresh, interval * 1000);
		return () => clearInterval(timer);
	}, [refresh, interval]);

	// 排序后的进程列表
	const processes = useMemo(
		() => sortProcesses(rawProcesses, sortField),
		[rawProcesses, sortField],
	);

	/** 选择下一个进程 */
	const selectNext = useCallback(() => {
		setSelectedIndex((prev) => Math.min(prev + 1, processes.length - 1));
	}, [processes.length]);

	/** 选择上一个进程 */
	const selectPrev = useCallback(() => {
		setSelectedIndex((prev) => Math.max(prev - 1, 0));
	}, []);

	/** 循环切换排序字段 */
	const cycleSortField = useCallback(() => {
		setSortField((prev) => {
			const order: SortField[] = ["cpu", "memory", "elapsed", "default"];
			const idx = order.indexOf(prev);
			return order[(idx + 1) % order.length];
		});
	}, []);

	/**
	 * 终止当前选中的进程
	 * @param force 是否强制终止（SIGKILL）
	 * @returns 是否成功终止
	 */
	const killSelected = useCallback(
		async (force = false) => {
			const proc = processes[selectedIndex];
			if (!proc) return false;

			const success = await killProcess(proc.pid, force);
			if (success) {
				await refresh();
			}
			return success;
		},
		[processes, selectedIndex, refresh],
	);

	const selectedProcess = processes[selectedIndex] || null;

	return {
		processes,
		loading,
		error,
		selectedIndex,
		selectedProcess,
		sortField,
		refresh,
		selectNext,
		selectPrev,
		cycleSortField,
		killSelected,
	};
}
