import { Text } from "ink";
import React from "react";
import type { ProcessInfo } from "../types.js";

interface ProcessRowProps {
	proc: ProcessInfo;
	isSelected: boolean;
}

export function ProcessRow({ proc, isSelected }: ProcessRowProps) {
	return (
		<Text
			backgroundColor={isSelected ? "blue" : undefined}
			color={isSelected ? "white" : undefined}
		>
			{String(proc.pid).padEnd(8)}
			{proc.cpu.padEnd(8)}
			{proc.mem.padEnd(8)}
			{proc.etime.padEnd(12)}
			{proc.cwd}
		</Text>
	);
}
