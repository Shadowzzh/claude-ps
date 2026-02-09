/** Claude 进程基础信息 */
export interface ClaudeProcess {
	pid: number;
	tty: string;
	cwd: string;
	isCurrent: boolean;
	isOrphan: boolean;
	cpu: number;
	memory: number;
	startTime: Date;
	elapsed: string;
	sessionPath: string;
}

/** 会话消息 */
export interface SessionMessage {
	role: "user" | "assistant";
	content: string;
	timestamp: string;
}

/** 增量读取结果 */
export interface IncrementalMessages {
	messages: SessionMessage[];
	totalLines: number;
}

/** 包含会话消息的增强进程信息 */
export interface EnrichedProcess extends ClaudeProcess {
	messages: SessionMessage[];
}

/** 排序字段类型 */
export type SortField = "cpu" | "memory" | "elapsed" | "default";

/** useProcesses hook 返回值类型 */
export interface UseProcessesReturn {
	processes: EnrichedProcess[];
	loading: boolean;
	error: string | null;
	selectedIndex: number;
	selectedProcess: EnrichedProcess | null;
	sortField: SortField;
	refresh: () => Promise<void>;
	selectNext: () => void;
	selectPrev: () => void;
	cycleSortField: () => void;
	killSelected: (force?: boolean) => Promise<boolean>;
}
