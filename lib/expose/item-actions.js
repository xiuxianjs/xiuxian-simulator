import { boolean, fields, integer, list, object, text } from "./schema.js";
import { mutation, observation } from "./mutation.js";
import { parseConsumeResult, parseMingwuSelection, parsePeiyuanPending } from "../api/bot/consume.js";
import { parseItemDetail } from "../api/bot/item-detail-queries.js";
import { parseGreenBottleCapacity } from "../api/bot/green-bottle-storage-capacity.js";
import { parseGreenBottleStore } from "../api/bot/green-bottle-store.js";
import { ExposeError } from "alemonjs";

//#region src/expose/item-actions.ts
const quantity = {
	type: "integer",
	minimum: 1,
	maximum: 2147483647
};
const peiyuanPendingSchema = object({
	snapshot: {
		type: "string",
		minLength: 64,
		maxLength: 64
	},
	quantity: integer,
	view: object({
		...fields(text, "headingText confirmPromptText"),
		...fields(boolean, "hasChanges showRollDetails"),
		changeLines: list(text),
		rollLines: list(text)
	})
}, ["snapshot"]);
const mingwu = object({
	...fields(integer, "quantity remainingCount"),
	guidanceText: text,
	books: list(object({
		...fields(integer, "skillBookId proficiency"),
		...fields(text, "name statusText"),
		canSelect: boolean
	}))
});
const itemCategoryLabels = {
	item: "物品",
	equipment: "装备",
	profession_tool: "天工",
	skill_book: "功法"
};
const itemDetails = object({
	entries: list(object({
		category: text,
		entryId: integer,
		name: text,
		detailsJson: text
	})),
	memorialJson: text
}, ["memorialJson"]);
function itemDetail(data, query) {
	const result = parseItemDetail(data, query);
	return {
		entries: result.entries.map((entry) => ({
			category: entry.category,
			entryId: entry.record.id,
			name: entry.record.name,
			detailsJson: JSON.stringify(entry)
		})),
		...result.memorial === null ? {} : { memorialJson: JSON.stringify(result.memorial) }
	};
}
const itemActions = {
	find_item_detail: observation("按名称查询物品、装备、天工或功法模板及来源；可能返回多个同名类别。详情 JSON 为服务端原始结构，不表示本人持有。", "items.detail", object({ name: {
		type: "string",
		minLength: 1,
		maxLength: 100
	} }), itemDetails, (input) => `/物品详情 ${input.name}`, (data, input) => itemDetail(data, { name: input.name }), (input) => ({ name: input.name })),
	get_item_detail_by_id: observation("按类别及模板编号查询物品详情和来源；entryId 是模板编号，不是背包实例编号。", "items.detail", object({
		category: {
			type: "string",
			enum: [
				"item",
				"equipment",
				"profession_tool",
				"skill_book"
			]
		},
		entryId: {
			type: "integer",
			minimum: 1,
			maximum: Number.MAX_SAFE_INTEGER
		}
	}), itemDetails, (input) => `/物品详情 ${itemCategoryLabels[input.category]} ${input.entryId}`, (data, input) => itemDetail(data, input), (input) => ({
		category: input.category,
		entryId: input.entryId
	})),
	consume_item: mutation("按背包中的精确道具名称消耗库存，由服务端解释效果和数量。检查 outcome：rejected 未使用；peiyuan_pending 用原 snapshot 调用 get_peiyuan_confirmation，再以原 reference 确认或取消；mingwu_select 尚需选择。不能把待确认报告为已完成培养。", "items.consume", object({
		itemName: {
			type: "string",
			minLength: 1,
			maxLength: 64
		},
		quantity
	}), object({
		outcome: {
			type: "string",
			enum: [
				"consumed",
				"rejected",
				"formation_activated",
				"tower_reset",
				"peiyuan_pending",
				"mingwu_select"
			]
		},
		message: text,
		remainingQuantity: integer,
		peiyuanPending: peiyuanPendingSchema,
		mingwuSelection: mingwu
	}, [
		"remainingQuantity",
		"peiyuanPending",
		"mingwuSelection"
	]), (input) => `/消耗 ${input.itemName} ${input.quantity}`, (data) => {
		const result = parseConsumeResult(data);
		return {
			outcome: result.outcome,
			message: result.message,
			remainingQuantity: result.remainingQuantity,
			...result.outcome === "peiyuan_pending" ? { peiyuanPending: parsePeiyuanPending(result.pending) } : {},
			...result.outcome === "mingwu_select" ? { mingwuSelection: parseMingwuSelection(result.pending) } : {}
		};
	}, (input) => input, (input) => {
		if (/\s/u.test(input.itemName) || /^\d+$/u.test(input.itemName) || [...`/消耗 ${input.itemName} ${input.quantity}`].length > 80) throw new ExposeError("INVALID_INPUT", "道具名称须使用现有指令支持的完整单个名称，且完整指令不得超过80字符");
	}),
	get_green_bottle_capacity: observation("查询当前角色溢出修为存储资格、每瓶修为成本和最大可存储量，不执行转换。", "green-bottle.capacity", object({}), object({
		...fields(integer, "experienceCost maxAvailable"),
		canStore: boolean
	}), () => "/小绿瓶存储", parseGreenBottleCapacity),
	store_green_bottles: mutation("将溢出修为转换为小绿瓶，消耗和实际转换量由服务端决定；先查询容量，不能假设请求数量全部转换。", "green-bottle.store", object({ count: quantity }), object({
		success: boolean,
		message: text,
		...fields(integer, "experienceCost converted remainingExp totalBottles")
	}, [
		"converted",
		"remainingExp",
		"totalBottles"
	]), (input) => `/小绿瓶存储 ${input.count}`, parseGreenBottleStore)
};

//#endregion
export { itemActions, peiyuanPendingSchema };