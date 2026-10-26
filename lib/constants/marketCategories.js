//#region src/constants/marketCategories.ts
/**
* 交易所分类定义
* - key: { type, subtype } 用于数据库查询
* - displayName: 中文显示名，用于UI展示
*/
const MARKET_CATEGORIES = [
	{
		key: {
			type: "prop",
			subtype: "pill"
		},
		displayName: "丹药",
		description: "可服用的丹药"
	},
	{
		key: {
			type: "prop",
			subtype: "gift"
		},
		displayName: "礼物",
		description: "道侣礼物"
	},
	{
		key: { type: "soul_artifact" },
		displayName: "本命",
		description: "本命（独立存储）"
	},
	{
		key: {
			type: "prop",
			subtype: "other"
		},
		displayName: "其它",
		description: "其它道具"
	},
	{
		key: {
			type: "material",
			subtype: "herb"
		},
		displayName: "草药",
		description: "草药材料"
	},
	{
		key: {
			type: "material",
			subtype: "exp"
		},
		displayName: "经验材料",
		description: "提供经验值的材料"
	},
	{
		key: {
			type: "material",
			subtype: "other"
		},
		displayName: "其它",
		description: "其它材料"
	},
	{
		key: { type: "equipment" },
		displayName: "装备",
		description: "装备"
	},
	{
		key: { type: "profession_tool" },
		displayName: "天工",
		description: "天工工具"
	},
	{
		key: { type: "skill_book" },
		displayName: "功法",
		description: "功法书籍"
	}
];
/**
* 中文名称到分类键的映射
* 用于解析用户指令
*/
const CHINESE_TO_CATEGORY_KEY = {
	丹药: {
		type: "prop",
		subtype: "pill"
	},
	礼物: {
		type: "prop",
		subtype: "gift"
	},
	本命: { type: "soul_artifact" },
	其它: {
		type: "prop",
		subtype: "other"
	},
	草药: {
		type: "material",
		subtype: "herb"
	},
	经验材料: {
		type: "material",
		subtype: "exp"
	},
	装备: { type: "equipment" },
	天工: { type: "profession_tool" },
	功法: { type: "skill_book" }
};
/**
* 分类键到中文名称的映射
* 用于UI展示
*/
const CATEGORY_KEY_TO_CHINESE = {
	"prop:pill": "丹药",
	"prop:gift": "礼物",
	soul_artifact: "本命",
	"prop:other": "其它",
	"material:herb": "草药",
	"material:exp": "经验材料",
	"material:other": "其它",
	equipment: "装备",
	profession_tool: "天工",
	skill_book: "功法"
};
/**
* 生成分类键的唯一字符串表示
*/
function getCategoryKeyString(key) {
	if (key.subtype) return `${key.type}:${key.subtype}`;
	return key.type;
}
/**
* 从字符串解析分类键
*/
function parseCategoryKeyString(str) {
	if (str === "equipment" || str === "profession_tool" || str === "skill_book" || str === "soul_artifact") return { type: str };
	const parts = str.split(":");
	if (parts.length === 2) return {
		type: parts[0],
		subtype: parts[1]
	};
	if (parts.length === 1 && (parts[0] === "prop" || parts[0] === "material")) return { type: parts[0] };
	return null;
}
/**
* 根据中文名称获取分类键
*/
function getCategoryKeyByChinese(cnName) {
	return CHINESE_TO_CATEGORY_KEY[cnName];
}
/**
* 根据分类键获取中文名称
*/
function getChineseByCategoryKey(key) {
	const keyStr = getCategoryKeyString(key);
	return CATEGORY_KEY_TO_CHINESE[keyStr] ?? "未知分类";
}
/**
* 检查分类键是否为统一物品类型（prop/material）
*/
function isUnifiedItemCategory(key) {
	return key.type === "prop" || key.type === "material";
}
/**
* 检查分类键是否为装备类型
*/
function isEquipmentCategory(key) {
	return key.type === "equipment";
}
/**
* 检查分类键是否为天工类型
*/
function isProfessionToolCategory(key) {
	return key.type === "profession_tool";
}
/**
* 检查分类键是否为功法类型
*/
function isSkillBookCategory(key) {
	return key.type === "skill_book";
}
/**
* 获取所有分类的中文名称列表（用于UI展示）
*/
function getAllCategoryChineseNames() {
	return Object.keys(CHINESE_TO_CATEGORY_KEY);
}
/**
* 交易所分类中文名称列表（按顺序展示）
*/
const MARKET_CATEGORY_NAMES_SORTED = [
	"丹药",
	"礼物",
	"其它",
	"草药",
	"经验材料",
	"装备",
	"天工",
	"功法",
	"本命"
];
/**
* 根据 itemCategory + itemType + itemSubtype 获取物品类型中文标签
* 用于在列表展示时区分物品类型
*/
function getItemCategoryLabel(itemCategory, itemType, itemSubtype) {
	if (itemCategory === "equipment") return "装备";
	if (itemCategory === "profession_tool") return "天工";
	if (itemCategory === "skill_book") return "功法";
	if (itemCategory === "soul_artifact") return "本命";
	if (itemType && itemSubtype) {
		const keyStr = `${itemType}:${itemSubtype}`;
		return CATEGORY_KEY_TO_CHINESE[keyStr] ?? "物品";
	}
	return "物品";
}

//#endregion
export { CATEGORY_KEY_TO_CHINESE, CHINESE_TO_CATEGORY_KEY, MARKET_CATEGORIES, MARKET_CATEGORY_NAMES_SORTED, getAllCategoryChineseNames, getCategoryKeyByChinese, getCategoryKeyString, getChineseByCategoryKey, getItemCategoryLabel, isEquipmentCategory, isProfessionToolCategory, isSkillBookCategory, isUnifiedItemCategory, parseCategoryKeyString };