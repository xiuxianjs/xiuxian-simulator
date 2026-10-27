import { boolean, fields, integer, object, text } from "./schema.js";
import { mutation } from "./mutation.js";

//#region src/expose/mingwu-actions.ts
const mingwuActions = { use_mingwu_pill: mutation("服用明悟丹参悟本人装备中的功法。skillBookId 是 consume_item 明悟选择返回的功法模板ID，expectedProficiency 必须是该选项的原熟练度，quantity 使用原选择数量。状态变化时拒绝，不会自动换功法或更新确认参数；检查实际 consumedCount 和 proficiencyGain。使用原消息重试以复用幂等键。", "mingwu.confirm", object({
	skillBookId: {
		type: "integer",
		minimum: 1,
		maximum: Number.MAX_SAFE_INTEGER
	},
	quantity: {
		type: "integer",
		minimum: 1,
		maximum: 2147483647
	},
	expectedProficiency: {
		type: "integer",
		minimum: 0,
		maximum: 59
	}
}), object({
	...fields(text, "message skillBookName guidanceText"),
	...fields(integer, "proficiencyGain currentProficiency remainingCount consumedCount"),
	canContinue: boolean
}), (input) => `/确认明悟丹 ${input.skillBookId} ${input.quantity}`, (data, input) => {
	const row = data;
	if (!row || typeof row !== "object" || Array.isArray(row) || typeof row.message !== "string" || typeof row.skillBookName !== "string" || typeof row.guidanceText !== "string" || typeof row.canContinue !== "boolean" || [
		"proficiencyGain",
		"currentProficiency",
		"remainingCount",
		"consumedCount"
	].some((key) => !Number.isSafeInteger(row[key]) || row[key] < 0) || row.consumedCount < 1 || row.consumedCount > input.quantity || row.currentProficiency > 60 || row.currentProficiency - input.expectedProficiency !== row.proficiencyGain) throw new Error("明悟丹结算回执与原选择不匹配，请核对功法熟练度与库存");
	return row;
}) };

//#endregion
export { mingwuActions };