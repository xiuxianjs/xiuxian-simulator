import { invert } from "lodash-es";

//#region src/constants/storage.ts
/**
* 储物袋相关常量定义
*/
const CATEGORY_NAMES = {
	materials: "材料",
	pills: "丹药",
	expItems: "经验道具",
	equipments: "装备",
	skillBooks: "功法",
	props: "道具"
};
const CATEGORY_MAP = invert(CATEGORY_NAMES);
const ITEM_TYPE_CONFIG = {
	materials: {
		foreignKey: "materialId",
		itemName: "材料",
		quantifier: "个"
	},
	pills: {
		foreignKey: "pillId",
		itemName: "丹药",
		quantifier: "个"
	},
	expItems: {
		foreignKey: "expItemId",
		itemName: "经验道具",
		quantifier: "个"
	},
	equipments: {
		foreignKey: "equipmentId",
		itemName: "装备",
		quantifier: "件"
	},
	skillBooks: {
		foreignKey: "skillBookId",
		itemName: "功法",
		quantifier: "本"
	},
	props: {
		foreignKey: "propId",
		itemName: "道具",
		quantifier: "个"
	}
};

//#endregion
export { CATEGORY_MAP, CATEGORY_NAMES, ITEM_TYPE_CONFIG };