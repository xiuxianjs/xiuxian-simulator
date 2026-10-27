//#region src/expose/queries.ts
const text = { type: "string" };
const integer = { type: "integer" };
const count = {
	type: "integer",
	minimum: 0
};
const array = (items) => ({
	type: "array",
	items
});
const object = (properties, required = Object.keys(properties)) => ({
	type: "object",
	properties,
	required,
	additionalProperties: false
});
const capability = object({
	kind: text,
	recipeId: {
		type: "integer",
		minimum: 1
	}
}, ["kind"]);
const inventorySchema = object({
	activeSubcategory: text,
	playerStageLevel: integer,
	pagination: object({
		page: {
			type: "integer",
			minimum: 1
		},
		pageSize: {
			type: "integer",
			minimum: 1
		},
		total: count,
		totalPages: count
	}),
	capabilities: array(capability),
	items: array(object({
		userItemId: count,
		itemId: count,
		name: text,
		type: text,
		subtype: text,
		quantity: integer,
		listedQuantity: integer,
		stackMax: integer,
		permission: integer,
		isStackable: { type: "boolean" },
		lockState: {
			type: "integer",
			description: "保留服务端锁定状态数值；布尔值转为 0/1，不据此推导可消耗数量。"
		},
		capabilities: array(capability)
	}, [
		"userItemId",
		"itemId",
		"name",
		"type",
		"quantity",
		"listedQuantity",
		"stackMax",
		"permission",
		"isStackable",
		"lockState",
		"capabilities"
	]))
});
function projectInventory(page) {
	const capabilities = (values) => values.map((value) => ({
		kind: value.kind,
		...value.recipeId === void 0 ? {} : { recipeId: value.recipeId }
	}));
	return {
		activeSubcategory: page.activeSubcategory,
		playerStageLevel: page.playerStageLevel,
		pagination: {
			page: page.pagination.page,
			pageSize: page.pagination.pageSize,
			total: page.pagination.total,
			totalPages: page.pagination.totalPages
		},
		capabilities: capabilities(page.capabilities),
		items: page.items.map((item) => ({
			userItemId: item.userItemId,
			itemId: item.itemId,
			name: item.name,
			type: item.type,
			...item.subtype === null ? {} : { subtype: item.subtype },
			quantity: item.quantity,
			listedQuantity: item.listedQuantity,
			stackMax: item.stackMax,
			permission: item.permission,
			isStackable: item.isStackable,
			lockState: Number(item.isLocked),
			capabilities: capabilities(item.capabilities)
		}))
	};
}
const templateSchema = object({
	slot: count,
	name: text,
	equipmentCount: count,
	equipmentNames: array(text),
	skills: array(object({
		slot: text,
		name: text
	})),
	missingEquipmentCount: count,
	missingSkillCount: count
});
const templatesSchema = object({
	current: templateSchema,
	templates: array(templateSchema)
});
function projectTemplates(data) {
	const project = (value) => ({
		slot: value.slot,
		name: value.name,
		equipmentCount: value.equipmentCount,
		equipmentNames: [...value.equipmentNames],
		skills: Object.entries(value.skillNames).map(([slot, name]) => ({
			slot,
			name
		})),
		missingEquipmentCount: value.missingEquipmentCount,
		missingSkillCount: value.missingSkillCount
	});
	return {
		current: project(data.current),
		templates: data.templates.map(project)
	};
}

//#endregion
export { inventorySchema, projectInventory, projectTemplates, templateSchema, templatesSchema };