export interface SessionInfo {
	sessionId: string;
	summary: string;
	messageCount: number;
	created: string;
	modified: string;
}

export interface ProcessInfo {
	pid: number;
	cpu: string;
	mem: string;
	etime: string;
	cwd: string;
	command: string;
	projectName: string;
	claudeProjectPath: string;
	session?: SessionInfo;
}
