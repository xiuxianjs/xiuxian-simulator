import { PAGE_SIZE as PAGE_SIZE$1 } from "./common.js";
import "./index.js";

//#region src/constants/newStorage.ts
/**
* 新储物袋系统常量定义（基于统一物品架构）
*/
const PAGE_SIZE = 5;
const CACHE_TTL = 3e5;
const REDIS_KEYS = {
	EQUIPMENT_TYPES: "storage:equipment:types",
	SKILL_TYPES: "storage:skill:types"
};
const PROP_SUBCATEGORIES = [
	"pill",
	"danfang",
	"gift",
	"other"
];
const MATERIAL_SUBCATEGORIES = [
	"herb",
	"exp",
	"other"
];
const CATEGORY_NAMES = {
	prop: "道具",
	material: "材料",
	equipments: "装备",
	professionTools: "天工",
	skillBooks: "功法",
	soulArtifacts: "本命",
	lootboxes: "礼盒"
};
const SUBCATEGORY_NAMES = {
	pill: "丹药",
	danfang: "丹方",
	gift: "礼物",
	lootbox: "礼盒",
	other: "其它",
	herb: "草药",
	exp: "经验材料",
	"other-mat": "其它"
};
const SUBCATEGORY_CODE_MAP = {
	丹药: "pill",
	丹方: "danfang",
	礼物: "gift",
	礼盒: "lootbox",
	其它: "other",
	草药: "herb",
	经验材料: "exp"
};

//#endregion
export { CACHE_TTL, CATEGORY_NAMES, MATERIAL_SUBCATEGORIES, PAGE_SIZE, PROP_SUBCATEGORIES, REDIS_KEYS, SUBCATEGORY_CODE_MAP, SUBCATEGORY_NAMES };