//#region src/constants/itemTypes.ts
/**
* 物品类型枚举（仅可堆叠物品）
*/
const ITEM_TYPES = {
	PROP: "prop",
	MATERIAL: "material"
};
/**
* 道具子类型枚举
*/
const PROP_SUBTYPES = {
	PILL: "pill",
	DANFANG: "danfang",
	GIFT: "gift",
	BENMING: "benming",
	OTHER: "other"
};
/**
* 材料子类型枚举
*/
const MATERIAL_SUBTYPES = {
	HERB: "herb",
	EXP: "exp",
	OTHER: "other"
};
/**
* 物品子类型映射
*/
const ITEM_SUBTYPES = {
	PROP: PROP_SUBTYPES,
	MATERIAL: MATERIAL_SUBTYPES
};
/**
* 物品类型值数组
*/
const ITEM_TYPE_VALUES = Object.values(ITEM_TYPES);
/**
* 物品子类型值数组
*/
const ITEM_SUBTYPE_VALUES = [...Object.values(PROP_SUBTYPES), ...Object.values(MATERIAL_SUBTYPES)];
/**
* 判断值是否为物品类型
* @param value 待判断的值
* @returns 是否为物品类型
*/
function isItemType(value) {
	return typeof value === "string" && ITEM_TYPE_VALUES.includes(value);
}
/**
* 判断值是否为物品子类型
* @param value 待判断的值
* @returns 是否为物品子类型
*/
function isItemSubtype(value) {
	return typeof value === "string" && ITEM_SUBTYPE_VALUES.includes(value);
}
/**
* 判断值是否为道具子类型
* @param value 待判断的值
* @returns 是否为道具子类型
*/
function isPropSubtype(value) {
	return typeof value === "string" && Object.values(PROP_SUBTYPES).includes(value);
}
/**
* 判断值是否为材料子类型
* @param value 待判断的值
* @returns 是否为材料子类型
*/
function isMaterialSubtype(value) {
	return typeof value === "string" && Object.values(MATERIAL_SUBTYPES).includes(value);
}
/**
* 根据物品类型获取对应的子类型列表
* @param itemType 物品类型
* @returns 该物品类型对应的子类型数组
*/
function getSubtypesByType(itemType) {
	switch (itemType) {
		case "prop": return Object.values(PROP_SUBTYPES);
		case "material": return Object.values(MATERIAL_SUBTYPES);
		default: return [];
	}
}

//#endregion
export { ITEM_SUBTYPES, ITEM_SUBTYPE_VALUES, ITEM_TYPES, ITEM_TYPE_VALUES, MATERIAL_SUBTYPES, PROP_SUBTYPES, getSubtypesByType, isItemSubtype, isItemType, isMaterialSubtype, isPropSubtype };