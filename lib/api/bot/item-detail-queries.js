import { requestBackend } from "./client.js";

//#region src/api/bot/item-detail-queries.ts
const object = (value) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("物品详情接口数据不完整");
	return value;
};
const nullableText = (value) => value === null || typeof value === "string";
async function getBackendItemDetail(bid, uid, query) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseItemDetail(object(await requestBackend(bid, "get_players_id_catalog_item_detail", {
		path: { id: uid },
		query
	})), query);
}
function parseItemDetail(data, query = {}) {
	if (!Array.isArray(data.entries) || !Object.hasOwn(data, "memorial")) throw new Error("物品详情接口数据不完整");
	if (data.memorial !== null) {
		const memorial = object(data.memorial);
		if (![
			"userName",
			"partnerName",
			"companionSince"
		].every((key) => nullableText(memorial[key]))) throw new Error("物品详情纪念品数据不完整");
	}
	const seen = /* @__PURE__ */ new Set();
	for (const raw of data.entries) {
		const entry = object(raw);
		const value = object(entry.record);
		const sources = object(entry.sources);
		if (!Array.isArray(entry.view) || entry.view.some((block) => {
			if (!block || typeof block !== "object" || Array.isArray(block)) return true;
			const row = block;
			return typeof row.kind !== "string" || ![
				"text",
				"newline",
				"quote",
				"source"
			].includes(row.kind) || row.kind !== "newline" && typeof row.text !== "string" || row.text !== void 0 && typeof row.text !== "string" || row.command !== void 0 && typeof row.command !== "string";
		})) throw new Error("物品详情展示投影无效");
		if (![
			"item",
			"equipment",
			"profession_tool",
			"skill_book"
		].includes(entry.category) || seen.has(entry.category) || !Number.isSafeInteger(value.id) || value.id < 1 || typeof value.name !== "string" || query.category && (entry.category !== query.category || value.id !== query.entryId)) throw new Error("物品详情返回对象不一致");
		seen.add(entry.category);
		if (![
			"stages",
			"dungeons",
			"recipes",
			"shops",
			"guildShop",
			"materials"
		].every((key) => Array.isArray(sources[key])) || !Array.isArray(entry.setEffects)) throw new Error("物品详情来源数据不完整");
		for (const key of [
			"grade",
			"lore",
			"equipmentSet"
		]) if (entry[key] !== null) object(entry[key]);
		if (entry.category === "equipment" && !Object.hasOwn(value, "equipmentType")) throw new Error("物品详情缺少装备类型");
		if (entry.category === "skill_book") {
			if (!Object.hasOwn(value, "skill")) throw new Error("物品详情缺少技能");
		}
	}
	return data;
}

//#endregion
export { getBackendItemDetail, parseItemDetail };