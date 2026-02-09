import chokidar from "chokidar";
import { useEffect, useRef } from "react";

/**
 * 文件监听 Hook
 * 监听多个会话文件的变化，文件变化时触发回调
 * @param sessionPaths 要监听的会话文件路径数组
 * @param onFileChange 文件变化时的回调函数
 */
export function useSessionWatcher(
	sessionPaths: string[],
	onFileChange: (path: string) => void,
): void {
	const watcherRef = useRef<ReturnType<typeof chokidar.watch> | null>(null);
	const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

	useEffect(() => {
		// 过滤掉空路径
		const validPaths = sessionPaths.filter((p) => p && p.length > 0);
		if (validPaths.length === 0) return;

		// 创建文件监听器
		const watcher = chokidar.watch(validPaths, {
			persistent: true,
			ignoreInitial: true, // 忽略初始添加事件
			awaitWriteFinish: {
				stabilityThreshold: 50, // 文件稳定 50ms 后触发
				pollInterval: 25,
			},
		});

		// 监听文件变化事件
		// @ts-expect-error - chokidar 类型定义与 Node.js FSWatcher 冲突
		watcher.on("change", (path: string) => {
			// 防抖处理：100ms 内只触发一次
			const existingTimer = debounceTimersRef.current.get(path);
			if (existingTimer) {
				clearTimeout(existingTimer);
			}

			const timer = setTimeout(() => {
				onFileChange(path);
				debounceTimersRef.current.delete(path);
			}, 100);

			debounceTimersRef.current.set(path, timer);
		});

		watcherRef.current = watcher;

		// 清理函数
		return () => {
			// 清理所有防抖定时器
			for (const timer of debounceTimersRef.current.values()) {
				clearTimeout(timer);
			}
			debounceTimersRef.current.clear();

			// 关闭监听器
			if (watcherRef.current) {
				watcherRef.current.close();
				watcherRef.current = null;
			}
		};
	}, [sessionPaths, onFileChange]);
}
