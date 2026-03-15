import { Box, Text } from "ink";
import React from "react";
import { padEndByWidth } from "../lib/format.js";
import type { ProcessInfo } from "../types.js";

interface ProcessRowProps {
	proc: ProcessInfo;
	isSelected: boolean;
}

export function ProcessRow({ proc, isSelected }: ProcessRowProps) {
	const rowWidth = 10;
	const summary = proc.session?.summary || "N/A";
	const truncated = summary.length > 40 ? `${summary.slice(0, 37)}...` : summary;

	return (
		<Text
			backgroundColor={isSelected ? "blue" : undefined}
			color={isSelected ? "white" : undefined}
		>
			{padEndByWidth(String(proc.pid), rowWidth)}
			{padEndByWidth(String(proc.cpu), rowWidth)}
			{padEndByWidth(String(proc.mem), rowWidth)}
			{padEndByWidth(String(proc.etime), rowWidth)}
			{padEndByWidth(String(proc.projectName), 20)}
			{padEndByWidth(truncated, 40)}
		</Text>
	);
}
