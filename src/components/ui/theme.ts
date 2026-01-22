/**
 * UI 主题配置
 * 借鉴 @inkjs/ui 的设计模式
 */

import type { ForegroundColorName } from "chalk";

export interface ThemeColors {
	foreground: {
		dim: ForegroundColorName;
		normal: ForegroundColorName;
		bright: ForegroundColorName;
	};
	background: {
		selected: ForegroundColorName;
	};
	border: ForegroundColorName;
}

export interface ThemeSpacing {
	paddingX: number;
}

export interface Theme {
	colors: ThemeColors;
	spacing: ThemeSpacing;
}

export const theme: Theme = {
	colors: {
		foreground: {
			dim: "gray",
			normal: "white",
			bright: "whiteBright",
		},
		background: {
			selected: "blue",
		},
		border: "gray",
	},
	spacing: {
		paddingX: 1,
	},
};
