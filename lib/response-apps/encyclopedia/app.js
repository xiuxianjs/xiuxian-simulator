import { getBackendEncyclopedia, getBackendToolCategories } from "../../api/bot/queries.js";
import "../../api/index.js";

//#region src/response-apps/encyclopedia/app.ts
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
async function getItemList(category, subCategory, page, bid) {
	if (category === "本命" || category === "本命物") return getBackendEncyclopedia(bid, category, subCategory, page);
	if (category === "天工") {
		if (!subCategory) return {
			code: "INVALID_SUB",
			data: { message: "请选择天工子分类" }
		};
		return getBackendEncyclopedia(bid, category, subCategory, page);
	}
	if (category === "道具") {
		if (!subCategory) return {
			code: "INVALID_SUB",
			data: { message: "请选择道具子分类" }
		};
		if (!ITEM_PROP_SUBS[subCategory]) return {
			code: "INVALID_SUB",
			data: { message: `未知道具子分类「${subCategory}」` }
		};
		return getBackendEncyclopedia(bid, category, subCategory, page);
	}
	if (category === "材料") {
		if (!subCategory) return {
			code: "INVALID_SUB",
			data: { message: "请选择材料子分类" }
		};
		if (!ITEM_MAT_SUBS[subCategory]) return {
			code: "INVALID_SUB",
			data: { message: `未知材料子分类「${subCategory}」` }
		};
		return getBackendEncyclopedia(bid, category, subCategory, page);
	}
	if (category === "装备") {
		if (!subCategory) return {
			code: "INVALID_SUB",
			data: { message: "请选择装备子分类" }
		};
		if (!EQUIP_TYPE_MAP[subCategory]) return {
			code: "INVALID_SUB",
			data: { message: `未知装备子分类「${subCategory}」` }
		};
		return getBackendEncyclopedia(bid, category, subCategory, page);
	}
	if (category === "功法") {
		if (!subCategory) return {
			code: "INVALID_SUB",
			data: { message: "请选择功法子分类" }
		};
		if (!SKILL_TYPE_MAP[subCategory]) return {
			code: "INVALID_SUB",
			data: { message: `未知功法子分类「${subCategory}」` }
		};
		return getBackendEncyclopedia(bid, category, subCategory, page);
	}
	return {
		code: "INVALID_SUB",
		data: { message: `未知分类「${category}」` }
	};
}
function getLifeEquipmentTypeNamesForEncyclopedia(bid) {
	return getBackendToolCategories(bid);
}

//#endregion
export { EQUIP_TYPE_MAP, ITEM_MAT_SUBS, ITEM_PROP_SUBS, SKILL_TYPE_MAP, getItemList, getLifeEquipmentTypeNamesForEncyclopedia, parseEncyclopediaCommand };