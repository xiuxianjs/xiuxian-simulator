import { requestBackend } from "./client.js";

//#region src/api/bot/leaderboard-catalog.ts
async function getBackendLeaderboardMenu(bid) {
	if (!bid) throw new Error("排行榜查询缺少平台身份");
	return parseLeaderboardMenu(await requestBackend(bid, "get_leaderboards"));
}
function parseLeaderboardMenu(data) {
	if (!Array.isArray(data)) throw new Error("排行榜目录接口数据不完整");
	const items = [];
	let hint = "";
	for (const value of data) {
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("排行榜目录条目不完整");
		const row = value;
		if (row.menuHint !== void 0) {
			if (typeof row.menuHint !== "string" || hint) throw new Error("排行榜目录提示不完整");
			hint = row.menuHint;
		}
		if (row.menu === void 0) continue;
		if (!row.menu || typeof row.menu !== "object" || Array.isArray(row.menu)) throw new Error("排行榜目录按钮不完整");
		const menu = row.menu;
		if (typeof menu.group !== "string" || typeof menu.label !== "string" || typeof menu.command !== "string" || typeof menu.description !== "string") throw new Error("排行榜目录按钮不完整");
		items.push({
			group: menu.group,
			label: menu.label,
			command: menu.command,
			description: menu.description
		});
	}
	if (items.length === 0 || !hint) throw new Error("排行榜目录展示数据不完整");
	return {
		items,
		hint
	};
}

//#endregion
export { getBackendLeaderboardMenu, parseLeaderboardMenu };