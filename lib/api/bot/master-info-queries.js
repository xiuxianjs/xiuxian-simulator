import { requestBackend } from "./client.js";

//#region src/api/bot/master-info-queries.ts
async function getBackendMasterInfo(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseMasterInfo(await requestBackend(bid, "get_players_id_master_info", { path: { id: uid } }));
}
function parseMasterInfo(value) {
	const v = value;
	if (!v?.access || typeof v.access.allowed !== "boolean" || !(v.access.realmName === null || typeof v.access.realmName === "string") || !Array.isArray(v.discipleHistory) || v.discipleSide === void 0 || v.masterSide === void 0 || v.masterSide !== null && (!v.masterSide.stats || !v.masterSide.virtueProgress || !Array.isArray(v.masterSide.disciples) || !Array.isArray(v.masterSide.history))) throw new Error("师门接口数据不完整");
	const rows = [...v.discipleSide ? [v.discipleSide] : [], ...v.masterSide?.disciples ?? []];
	for (const row of rows) if (!row?.graduationProgress || !row.masterSupportProgress || !row.discipleResponseProgress || !row.dailyProgress || typeof row.startedAt !== "string" || !Number.isFinite(row.interactionCount) || !Number.isFinite(row.activeDays) || typeof row.graduationProgress.statusText !== "string") throw new Error("师门接口数据不完整");
	if ([...v.discipleHistory, ...v.masterSide?.history ?? []].some((row) => typeof row.displayTargetName !== "string" || typeof row.displayTargetRealm !== "string" || typeof row.statusText !== "string" || typeof row.displayFinishedAt !== "string")) throw new Error("师门接口展示投影不完整");
	if (v.discipleSide && (typeof v.discipleSide.displayMasterName !== "string" || typeof v.discipleSide.displayMasterRealm !== "string" || v.discipleSide.blessing && typeof v.discipleSide.blessing.expireAtText !== "string") || v.masterSide && (typeof v.masterSide.virtueTitle !== "string" || v.masterSide.disciples.some((row) => typeof row.displayDiscipleName !== "string" || typeof row.displayDiscipleRealm !== "string") || v.masterSide.titleReward && typeof v.masterSide.titleReward.displayTitleName !== "string")) throw new Error("师门接口展示投影不完整");
	return v;
}

//#endregion
export { getBackendMasterInfo, parseMasterInfo };