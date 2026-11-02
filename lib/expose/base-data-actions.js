import { requestBackend } from "../api/bot/client.js";
import { authorize, currentPlayer } from "./access.js";
import { boolean, fields, integer, list, object, project, text } from "./schema.js";
import { parseBackendEncyclopedia } from "../api/bot/queries.js";
import { observation } from "./mutation.js";
import { Expose, ExposeError } from "alemonjs";

//#region src/expose/base-data-actions.ts
const categories = [
	"道具",
	"材料",
	"装备",
	"天工",
	"功法",
	"本命物"
];
const realm = object({
	name: text,
	...fields(integer, "id level stageLevel spiritualPower speed magicDefense physicalDefense magicAttack physicalAttack hp experienceLimit attributePoints"),
	...fields(integer, "maxStrength maxIntelligence maxConstitution maxAgility maxLuck")
});
const realmPage = object({
	items: list(realm),
	...fields(integer, "total page pageSize")
});
function baseTypeQuery(operation, description, row) {
	const output = object({
		items: list(row),
		...fields(integer, "total page pageSize")
	});
	return observation(`${description} 数据来自服务端真实基础配置，不含玩家实例或业务记录。`, operation, object({
		page: {
			type: "integer",
			minimum: 1,
			maximum: 21474836
		},
		pageSize: {
			type: "integer",
			minimum: 1,
			maximum: 100
		}
	}, ["page", "pageSize"]), output, () => "/基础配置", (data) => project(output, data), (input) => ({
		page: input.page ?? 1,
		pageSize: input.pageSize ?? 20
	}));
}
const baseDataActions = {
	get_base_forge_recipes: observation("分页查询已开放图纸的普通锻造基础配置：材料、产物模板、灵石、经验、考核及工具要求。requiredLevel/configuredToolGrade 是配置原值，craftRequiredLevel/toolGrade 是提前锻造配置生效后的要求。enabled 是全局开关。不含免费入门特例、玩家库存、学习进度或个人可打造判断。", "base.forge-recipes", object({
		page: {
			type: "integer",
			minimum: 1,
			maximum: 21474836
		},
		pageSize: {
			type: "integer",
			minimum: 1,
			maximum: 100
		}
	}, ["page", "pageSize"]), object({
		enabled: boolean,
		...fields(integer, "entryRealmId total page pageSize"),
		items: list(object({
			name: text,
			toolType: text,
			assessment: boolean,
			earlyCraft: boolean,
			...fields(integer, "recipeId outputEquipmentId requiredLevel craftRequiredLevel spiritStoneCost baseExp configuredToolGrade toolGrade"),
			materials: list(object(fields(integer, "itemId quantity")))
		}))
	}), () => "/锻造基础配方", (data) => data, (input) => ({
		page: input.page ?? 1,
		pageSize: input.pageSize ?? 20
	})),
	get_base_alchemy_recipes: observation("分页查询实际选中并验证的炼丹V2版本配方、材料和产物模板编号。fireDemand/furnaceDemand 为配置原值；excellentItemId=0 表示未配置。不返回玩家熟练度、库存或推算成功率。", "base.alchemy-recipes", object({
		page: {
			type: "integer",
			minimum: 1,
			maximum: 21474836
		},
		pageSize: {
			type: "integer",
			minimum: 1,
			maximum: 100
		}
	}, ["page", "pageSize"]), object({
		version: text,
		...fields(integer, "total page pageSize"),
		items: list(object({
			...fields(integer, "recipeId requiredLevel fireDemand furnaceDemand baseExp regularItemId excellentItemId outputQuantity"),
			materials: list(object(fields(integer, "itemId quantity")))
		}))
	}), () => "/炼丹基础配方", (data) => data, (input) => ({
		page: input.page ?? 1,
		pageSize: input.pageSize ?? 20
	})),
	get_base_grades: baseTypeQuery("base.grades", "分页查询品阶编号、名称、类别、等级及关联境界编号。", object({
		...fields(integer, "id level realmId"),
		...fields(text, "name category")
	})),
	get_base_equipment_types: baseTypeQuery("base.equipment-types", "分页查询装备类型编号、名称、分类和是否可打造。", object({
		id: integer,
		...fields(text, "name category"),
		isCraftable: { type: "boolean" }
	})),
	get_base_skill_types: baseTypeQuery("base.skill-types", "分页查询技能类型编号与名称。", object({
		id: integer,
		name: text
	})),
	get_base_realms: observation("分页查询服务端真实境界配置，按大境界、小层级及编号排序。属性与修为上限是配置值，不是任何玩家状态；不包含突破概率或未配置的规则。", "base.realms", object({
		page: {
			type: "integer",
			minimum: 1,
			maximum: 21474836
		},
		pageSize: {
			type: "integer",
			minimum: 1,
			maximum: 100
		}
	}, ["page", "pageSize"]), realmPage, () => "/境界基础配置", (data) => project(realmPage, data), (input) => ({
		page: input.page ?? 1,
		pageSize: input.pageSize ?? 20
	})),
	get_base_realm: observation("按境界模板编号查询真实境界基础属性、修为上限、属性点与五维上限；不查询玩家当前境界，也不推算突破消耗。", "base.realm", object({ realmId: {
		type: "integer",
		minimum: 1,
		maximum: Number.MAX_SAFE_INTEGER
	} }), realm, (input) => `/境界基础配置 ${input.realmId}`, (data, input) => {
		if (data?.id !== input.realmId) throw new ExposeError("INVALID_OUTPUT", "境界模板编号不匹配");
		return project(realm, data);
	}, (input) => ({ realmId: input.realmId })),
	get_base_data_categories: Expose.action({
		description: "查询真实服务端基础模板分类和子分类；只返回允许的基础类别，不含玩家、存档、排行榜或业务记录。",
		effect: "read",
		inputSchema: object({}),
		outputSchema: object({ categories: list(object({
			category: text,
			subCategories: list(text)
		})) }),
		authorize,
		handler: async (_input, context) => {
			const { bid, request } = await currentPlayer(context);
			const items = (await requestBackend(bid, "get_encyclopedia_categories", { ...request }))?.items;
			if (!Array.isArray(items)) throw new ExposeError("INVALID_OUTPUT", "基础分类响应不完整");
			const result = items.map((item) => {
				if (typeof item?.category !== "string" || !Array.isArray(item.subCategories) || item.subCategories.some((value) => typeof value !== "string")) throw new ExposeError("INVALID_OUTPUT", "基础分类条目不完整");
				return {
					category: item.category,
					subCategories: item.subCategories
				};
			}).filter((item) => categories.includes(item.category));
			context.signal.throwIfAborted();
			return { categories: result };
		}
	}),
	get_base_data_entries: Expose.action({
		description: "分页查询真实基础模板编号、名称和品阶；编号是模板编号，不是玩家库存实例。仅允许固定基础类别，不接受表名、SQL、玩家 UID 或任意查询条件。",
		effect: "read",
		inputSchema: object({
			category: {
				type: "string",
				enum: [...categories]
			},
			subCategory: {
				type: "string",
				minLength: 1,
				maxLength: 100
			},
			page: {
				type: "integer",
				minimum: 1,
				maximum: 2147483647
			}
		}, ["subCategory", "page"]),
		outputSchema: object({
			items: list(object({
				id: integer,
				name: text,
				gradeName: text
			})),
			...fields(integer, "totalCount totalPages page")
		}),
		authorize,
		handler: async (input, context) => {
			const { bid, request } = await currentPlayer(context);
			const raw = await requestBackend(bid, "get_encyclopedia", {
				query: {
					category: input.category,
					subCategory: input.subCategory,
					page: input.page ?? 1
				},
				...request
			});
			const { items, totalCount, totalPages, page } = parseBackendEncyclopedia(raw, input.category).data;
			context.signal.throwIfAborted();
			return {
				items,
				totalCount,
				totalPages,
				page
			};
		}
	})
};

//#endregion
export { baseDataActions };