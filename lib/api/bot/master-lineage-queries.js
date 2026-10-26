import { requestBackend } from "./client.js";

//#region src/api/bot/master-lineage-queries.ts
function mapNode(value, uid, path = /* @__PURE__ */ new Set()) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("师谱接口数据不完整");
	const row = value;
	if (!Number.isSafeInteger(row.userId) || Number(row.userId) < 1 || row.name !== null && typeof row.name !== "string" || row.realmName !== null && typeof row.realmName !== "string" || row.relationStatus !== null && row.relationStatus !== 1 && row.relationStatus !== 2 || !Array.isArray(row.disciples) || path.has(Number(row.userId))) throw new Error("师谱接口数据不完整");
	const userId = Number(row.userId);
	path.add(userId);
	const node = {
		userId,
		userName: row.name === null ? `修士${userId}` : String(row.name),
		realmName: row.realmName === null ? "未知境界" : String(row.realmName),
		isSelf: userId === uid,
		relationStatusText: row.relationStatus === null ? void 0 : row.relationStatus === 2 ? "已出师" : "在培养",
		disciples: row.disciples.map((child) => mapNode(child, uid, path))
	};
	path.delete(userId);
	return node;
}
async function getBackendMasterLineage(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseMasterLineage(await requestBackend(bid, "get_players_id_master_lineage", { path: { id: uid } }), uid);
}
function parseMasterLineage(data, uid) {
	if (!data || typeof data !== "object" || Array.isArray(data) || !("root" in data)) throw new Error("师谱接口数据不完整");
	return { root: data.root === null ? null : mapNode(data.root, uid) };
}

//#endregion
export { getBackendMasterLineage, parseMasterLineage };