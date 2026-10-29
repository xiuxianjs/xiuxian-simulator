import { fields, integer, list, object, page, text } from "./schema.js";
import { observation } from "./mutation.js";
import { parseBackendEncyclopediaDetail } from "../api/bot/queries.js";
import { parseRobotEncyclopediaBrowse } from "../api/bot/encyclopedia-robot.js";

//#region src/expose/encyclopedia-actions.ts
const categories = [
	"道具",
	"材料",
	"装备",
	"天工",
	"功法",
	"本命",
	"本命物"
];
const encyclopediaActions = {
	browse_encyclopedia: observation("浏览图鉴分类、子分类或分页目录；使用返回的 detailPrefix 和条目 id 查询图鉴详情。", "encyclopedia.browse", object({
		category: {
			type: "string",
			enum: [...categories]
		},
		subCategory: {
			type: "string",
			minLength: 1,
			maxLength: 100
		},
		page
	}, [
		"category",
		"subCategory",
		"page"
	]), object({
		mode: {
			type: "string",
			enum: [
				"main",
				"subs",
				"list"
			]
		},
		toolNames: list(text),
		result: object({
			items: list(object({
				id: integer,
				name: text,
				gradeName: text
			})),
			...fields(integer, "totalCount totalPages page"),
			detailPrefix: text
		})
	}, ["result"]), (input) => `/图鉴${input.category ? ` ${input.category}` : ""}${input.subCategory ? ` ${input.subCategory}` : ""}${input.subCategory || input.category === "本命" || input.category === "本命物" ? ` p${input.page ?? 1}` : ""}`, (data, input) => {
		const result = parseRobotEncyclopediaBrowse(data, input.category ?? "");
		return {
			mode: result.mode,
			toolNames: result.toolNames,
			...result.result ? { result: result.result.data } : {}
		};
	}, (input) => ({
		category: input.category ?? "",
		subCategory: input.subCategory ?? "",
		page: input.page ?? 1
	})),
	get_encyclopedia_detail: observation("按图鉴类别和模板编号查询详情、配置及获取来源；不表示本人拥有该物品。detailsJson 保留完整的服务端数据。", "encyclopedia.detail", object({
		category: {
			type: "string",
			enum: [...categories]
		},
		targetId: {
			type: "integer",
			minimum: 1,
			maximum: Number.MAX_SAFE_INTEGER
		}
	}), object({
		category: text,
		targetId: integer,
		name: text,
		detailsJson: text
	}), (input) => `/图鉴详情 ${input.category} ${input.targetId}`, (data, input) => {
		const result = parseBackendEncyclopediaDetail(data, input.category, input.targetId);
		return {
			category: input.category,
			targetId: input.targetId,
			name: result.record.name,
			detailsJson: JSON.stringify(data)
		};
	}, (input) => ({
		category: input.category,
		targetId: input.targetId
	}))
};

//#endregion
export { encyclopediaActions };