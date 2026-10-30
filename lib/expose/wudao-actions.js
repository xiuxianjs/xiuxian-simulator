import { boolean, fields, integer, list, number, object, text } from "./schema.js";
import { intentIdSchema, mutation, observation, validateIntentId } from "./mutation.js";
import { parseWudaoOptions, parseWudaoResult } from "../api/bot/skill-book-wudao.js";
import { ExposeError } from "alemonjs";

//#region src/expose/wudao-actions.ts
const id = {
	type: "integer",
	minimum: 1,
	maximum: Number.MAX_SAFE_INTEGER
};
const option = object({
	...fields(text, "key label currentMaxText templateMaxText"),
	...fields(number, "currentMax templateMax"),
	isPercent: boolean
});
const options = object({
	skillBookId: integer,
	skillBookName: text,
	ownedStones: integer,
	status: text,
	message: text,
	options: list(option)
});
const resultSchema = object({
	skillBookId: integer,
	...fields(text, "skillBookName key label growthText newMaxText templateMaxText"),
	isPercent: boolean,
	...fields(number, "oldMax newMax templateMax growth"),
	remaining: integer
});
function parse(data, bookId, label) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("悟道回执不完整");
	const row = data;
	const selected = parseWudaoOptions(row.options);
	const result = row.result === null ? null : parseWudaoResult(row.result);
	if (row.bookId !== bookId || selected.skillBookId !== bookId || selected.status !== "ready" || !Number.isSafeInteger(selected.ownedStones) || selected.ownedStones < 1 || !selected.options.length || selected.options.some((item) => !item.key || !/^\S+$/.test(item.label) || item.currentMax <= 0 || item.templateMax <= item.currentMax) || (label ? !result : result !== null)) throw new Error("悟道回执不匹配");
	if (result && (result.skillBookId !== bookId || result.label !== label || !selected.options.some((item) => item.key === result.key && item.label === result.label && item.isPercent === result.isPercent) || !Number.isSafeInteger(result.remaining) || result.remaining < 0 || result.growth <= 0 || result.newMax <= result.oldMax || result.newMax > result.templateMax)) throw new Error("悟道结算回执不匹配");
	return {
		bookId,
		options: selected,
		...result ? { result } : {}
	};
}
const wudaoActions = {
	get_wudao_options: observation("查询本人已学功法可悟道的属性、当前及模板上限和悟道石数量；不消耗悟道石。", "skill-books.wudao", object({ bookId: id }), object({
		bookId: integer,
		options
	}), (input) => `/悟道 ${input.bookId}`, (data, input) => parse(data, input.bookId), (input) => ({
		bookId: String(input.bookId),
		label: ""
	})),
	perform_skill_wudao: mutation("消耗悟道石对已学功法的指定属性悟道，先查询可选属性；实际增长及剩余数量以服务端回执为准。同消息新悟道使用新 intentId，同次重试沿用原编号。", "skill-books.wudao", object({
		bookId: id,
		label: {
			type: "string",
			minLength: 1
		},
		intentId: intentIdSchema
	}, ["intentId"]), object({
		bookId: integer,
		options,
		result: resultSchema
	}), (input) => `/悟道 ${input.bookId} ${input.label}`, (data, input) => parse(data, input.bookId, input.label), (input) => ({
		bookId: String(input.bookId),
		label: input.label
	}), (input) => {
		validateIntentId(input.intentId);
		if (!/^\S+$/.test(input.label)) throw new ExposeError("INVALID_INPUT", "悟道属性必须是单个标签");
	}, { intentId: (input) => input.intentId })
};

//#endregion
export { wudaoActions };