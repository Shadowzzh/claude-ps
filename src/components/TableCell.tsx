import { Box, Text } from "ink";
import React from "react";

interface TableCellProps {
	width: number;
	isSelected: boolean;
	children: string;
}

export function TableCell({ width, isSelected, children }: TableCellProps) {
	return (
		<Box width={width} flexShrink={0}>
			<Text
				backgroundColor={isSelected ? "cyan" : undefined}
				color={isSelected ? "white" : undefined}
			>
				{children}
			</Text>
		</Box>
	);
}
