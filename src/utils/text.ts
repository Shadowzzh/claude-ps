/**
 * Extract text content from message content
 */
export function extractTextContent(
	content: string | Array<{ type: string; text?: string }>,
): string {
	if (typeof content === "string") {
		return content;
	}
	return (
		content
			.filter(
				(item: unknown) =>
					typeof item === "object" &&
					item &&
					"type" in item &&
					item.type === "text" &&
					"text" in item,
			)
			.map((item: unknown) => (item as { text: string }).text)
			.join("") || ""
	);
}

/**
 * Clean markdown tags from text
 */
export function cleanMarkdown(text: string): string {
	return text
		.replace(/^#{1,6}\s+/gm, "") // Remove headers
		.replace(/^[-*+]\s+/gm, "") // Remove list markers
		.replace(/^\d+\.\s+/gm, "") // Remove numbered list
		.replace(/^>\s+/gm, "") // Remove blockquote
		.replace(/`[^`]+`/g, "") // Remove inline code
		.replace(/\n+/g, " ") // Replace newlines with space
		.trim();
}

/**
 * Extract summary from text (max 50 chars)
 */
export function extractSummary(text: string): string {
	const cleaned = cleanMarkdown(text);
	return cleaned.substring(0, 50) + (cleaned.length > 50 ? "..." : "");
}
