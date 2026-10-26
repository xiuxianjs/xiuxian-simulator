//#region src/utils/storage-lock-view.ts
const categories = {
	材料: { category: "material" },
	道具: { category: "prop" },
	装备: { category: "equipments" },
	天工: { category: "professionTools" },
	功法: { category: "skillBooks" },
	本命: { category: "soulArtifacts" },
	"材料-草药": {
		category: "material",
		subtype: "herb"
	},
	"材料-经验材料": {
		category: "material",
		subtype: "exp"
	},
	"材料-经验": {
		category: "material",
		subtype: "exp"
	},
	"材料-其它": {
		category: "material",
		subtype: "other"
	},
	"道具-丹药": {
		category: "prop",
		subtype: "pill"
	},
	"道具-丹方": {
		category: "prop",
		subtype: "danfang"
	},
	"道具-其它": {
		category: "prop",
		subtype: "other"
	}
};
function storageLockSelector(input) {
	if (input.mode === "name" && input.itemName) return {
		kind: "name",
		name: input.itemName
	};
	if (input.mode !== "id" && input.mode !== "category" || !input.category || input.mode === "id" && typeof input.itemId !== "number") throw new Error("参数错误");
	let parsed = categories[input.category];
	for (const [prefix, category] of [
		["装备-", "equipments"],
		["天工-", "professionTools"],
		["功法-", "skillBooks"]
	]) if (!parsed && input.category.startsWith(prefix)) parsed = {
		category,
		typeName: input.category.slice(prefix.length)
	};
	if (!parsed) return {
		success: false,
		count: 0,
		message: `未知的分类：${input.category}`
	};
	if (input.mode === "id") return {
		kind: "instance",
		asset: {
			material: "item",
			prop: "item",
			equipments: "equipment",
			professionTools: "professionTool",
			skillBooks: "skillBook",
			soulArtifacts: "soulArtifact"
		}[parsed.category],
		instanceId: input.itemId
	};
	if (parsed.category === "soulArtifacts") return {
		success: false,
		count: 0,
		message: "未知的分类"
	};
	return {
		kind: "category",
		category: parsed.category,
		...parsed.subtype ? { subtype: parsed.subtype } : {},
		...parsed.typeName ? { typeName: parsed.typeName } : {}
	};
}

//#endregion
export { storageLockSelector };