import { render } from "ink";
import React from "react";
import { App } from "./components/App.js";

export function startTui() {
	console.clear();
	render(<App />);
}
