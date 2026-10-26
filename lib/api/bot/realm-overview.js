import { requestBackend } from "./client.js";

//#region src/api/bot/realm-overview.ts
async function getBackendRealmOverview(bid, uid) {
	if (!bid) throw new Error("境界查询缺少平台身份");
	return await requestBackend(bid, "get_players_id_realm_overview", { path: { id: uid } });
}
function parseRobotRealmOverview(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("境界展示响应不完整");
	const data = value;
	if (!Array.isArray(data.sections) || ![
		"canUseSoulPath",
		"showBreakthrough",
		"showPromotion",
		"showTribulation"
	].every((key) => typeof data[key] === "boolean")) throw new Error("境界展示响应不完整");
	return {
		sections: data.sections.map((value) => {
			if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("境界展示响应不完整");
			const section = value;
			if (typeof section.title !== "string" || !Array.isArray(section.lines) || !section.lines.every((line) => typeof line === "string")) throw new Error("境界展示响应不完整");
			return {
				title: section.title,
				lines: section.lines
			};
		}),
		canUseSoulPath: data.canUseSoulPath,
		showBreakthrough: data.showBreakthrough,
		showPromotion: data.showPromotion,
		showTribulation: data.showTribulation
	};
}

//#endregion
export { getBackendRealmOverview, parseRobotRealmOverview };