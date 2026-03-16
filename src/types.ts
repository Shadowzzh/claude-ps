/** 会话信息 */
export interface SessionInfo {
	/** 会话 ID */
	sessionId: string;
	/** 会话摘要 */
	summary: string;
	/** 消息数量 */
	messageCount: number;
	/** 创建时间 */
	created: string;
	/** 修改时间 */
	modified: string;
}

/** 进程信息 */
export interface ProcessInfo {
	/** 进程 ID */
	pid: number;
	/** CPU 使用率 */
	cpu: string;
	/** 内存使用率 */
	mem: string;
	/** 运行时长 */
	etime: string;
	/** 工作目录 */
	cwd: string;
	/** 启动命令 */
	command: string;
	/** 项目名称 */
	projectName: string;
	/** Claude 项目路径 */
	claudeProjectPath: string;
	/** 会话信息 */
	session?: SessionInfo;
}

/** 会话消息 */
export interface SessionMessage {
	/** 消息类型 */
	type: "user" | "assistant";
	/** 时间戳 */
	timestamp: string;
	message?: {
		/** 消息内容 */
		content: string | MessageContent[];
		usage?: {
			/** 输入 token 数 */
			input_tokens?: number;
			/** 输出 token 数 */
			output_tokens?: number;
		};
	};
}

/** 消息内容 */
export interface MessageContent {
	/** 内容类型 */
	type: "text" | "tool_use" | "thinking" | "tool_result";
	/** 文本内容 */
	text?: string;
	/** 思考内容 */
	thinking?: string;
	/** 工具名称 */
	name?: string;
	/** 工具输入参数 */
	input?: Record<string, unknown>;
	/** 工具结果内容 */
	content?: string | unknown;
	/** 工具调用 ID */
	tool_use_id?: string;
}

/** 会话统计信息 */
export interface SessionStats {
	/** 总消息数 */
	totalMessages: number;
	/** 用户消息数 */
	userMessages: number;
	/** AI 消息数 */
	assistantMessages: number;
	/** 总输入 token 数 */
	totalInputTokens: number;
	/** 总输出 token 数 */
	totalOutputTokens: number;
	/** 工具调用统计 */
	toolCalls: Record<string, number>;
	/** 思考次数 */
	thinkingCount: number;
	/** 开始时间 */
	startTime: string;
	/** 结束时间 */
	endTime: string;
}
