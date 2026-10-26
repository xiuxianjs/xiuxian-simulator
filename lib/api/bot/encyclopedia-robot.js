import { parseBackendEncyclopedia, parseBackendEncyclopediaDetail } from "./queries.js";

//#region src/api/bot/encyclopedia-robot.ts
/** 道具子分类（中文 → subtype） */
const ITEM_PROP_SUBS = {
	丹药: "pill",
	丹方: "danfang",
	其它: "other"
};
/** 材料子分类（中文 → subtype） */
const ITEM_MAT_SUBS = {
	草药: "herb",
	其它: "other"
};
/** 装备类型（中文 → type_id） */
const EQUIP_TYPE_MAP = {
	武器: 1,
	衣服: 2,
	鞋: 3,
	头饰: 4,
	羽翼: 5
};
/** 功法类型（中文 → skill_type_id） */
const SKILL_TYPE_MAP = {
	战技: 2,
	被动技: 3,
	神通: 4
};
function parseEncyclopediaCommand(messageText) {
	const m = (messageText ?? "").trim().match(/^(!|！|\/|#|＃)?图鉴(?:\s+(\S+))?(?:\s+(\S+))?(?:\s*p(\d+))?$/);
	const rawSubCategory = m?.[3] ?? null;
	const pageFromSubCategory = rawSubCategory?.match(/^p(\d+)$/);
	return {
		category: m?.[2] ?? null,
		subCategory: pageFromSubCategory ? null : rawSubCategory,
		page: m?.[4] ? Number(m[4]) : pageFromSubCategory ? Number(pageFromSubCategory[1]) : 1
	};
}
const COMMAND_PREFIX = /^(!|！|\/|#|＃)?图鉴详情\s*/;
function parseDetailCommand(messageText) {
	const m = (messageText ?? "").trim().replace(COMMAND_PREFIX, "").trim().match(/^(道具|材料|装备|天工|功法|本命|本命物)\s+(\d+)$/);
	if (!m) return {
		category: null,
		targetId: null
	};
	return {
		category: m[1],
		targetId: Number(m[2])
	};
}
function parseRobotEncyclopediaBrowse(value, category) {
	if (value?.mode === "main") return {
		mode: "main",
		toolNames: [],
		result: null
	};
	if (value?.mode === "subs" && Array.isArray(value.toolNames) && value.toolNames.every((name) => typeof name === "string")) return {
		mode: "subs",
		toolNames: value.toolNames,
		result: null
	};
	if (value?.mode !== "list") throw new Error("图鉴目录响应不完整");
	return {
		mode: "list",
		toolNames: [],
		result: parseBackendEncyclopedia(value.result, category)
	};
}
function parseRobotEncyclopediaDetail(value, category, targetId) {
	return {
		code: "OK",
		data: parseBackendEncyclopediaDetail(value, category, targetId)
	};
}

//#endregion
export { EQUIP_TYPE_MAP, ITEM_MAT_SUBS, ITEM_PROP_SUBS, SKILL_TYPE_MAP, parseDetailCommand, parseEncyclopediaCommand, parseRobotEncyclopediaBrowse, parseRobotEncyclopediaDetail };