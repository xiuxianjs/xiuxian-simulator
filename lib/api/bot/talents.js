//#region src/api/bot/talents.ts
function parsePlayerTalents(value) {
	if (!value || typeof value !== "object" || !("granted" in value) || typeof value.granted !== "boolean" || !("rulesVersion" in value) || !Number.isSafeInteger(value.rulesVersion) || !("talents" in value) || !Array.isArray(value.talents)) throw new Error("天赋响应不完整");
	const categories = /* @__PURE__ */ new Set();
	const talents = value.talents.map((row) => {
		if (!row || typeof row !== "object" || !("code" in row) || typeof row.code !== "string" || !("name" in row) || typeof row.name !== "string" || !("category" in row) || row.category !== "修行" && row.category !== "生活" && row.category !== "战斗" || !("description" in row) || typeof row.description !== "string" || !("enabled" in row) || typeof row.enabled !== "boolean" || !("implemented" in row) || typeof row.implemented !== "boolean" || row.enabled && !row.implemented || categories.has(row.category)) throw new Error("天赋条目不完整");
		categories.add(row.category);
		return {
			code: row.code,
			name: row.name,
			category: row.category,
			description: row.description,
			enabled: row.enabled,
			implemented: row.implemented
		};
	});
	if (talents.length !== (value.granted ? 3 : 0)) throw new Error("天赋数量不完整");
	return {
		granted: value.granted,
		rulesVersion: value.rulesVersion,
		talents
	};
}

//#endregion
export { parsePlayerTalents };