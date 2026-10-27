import { fields, integer, list, object, text } from "./schema.js";
import { mutation } from "./mutation.js";
import { parsePeiyuanPending } from "../api/bot/consume.js";
import { parsePeiyuanConfirm } from "../api/bot/peiyuan-confirm.js";
import { confirmationReferenceSchema, validateConfirmationReference } from "./confirmation.js";
import { peiyuanPendingSchema } from "./item-actions.js";
import { ExposeError } from "alemonjs";

//#region src/expose/peiyuan-actions.ts
const pending = object({
	quantity: integer,
	itemId: integer,
	createdAt: integer,
	snapshot: text,
	changes: list(object({
		...fields(text, "attribute attributeName"),
		...fields(integer, "change oldValue newValue")
	})),
	view: peiyuanPendingSchema.type === "object" ? peiyuanPendingSchema.properties.view : object({})
});
function decodePending(value) {
	const result = parsePeiyuanPending(value);
	const row = value;
	const changes = parsePeiyuanConfirm(value).changes;
	if (!result.snapshot || !Number.isSafeInteger(row.itemId) || row.itemId < 1 || !Number.isSafeInteger(row.createdAt) || row.createdAt < 1) throw new Error("培元丹原预览不完整");
	if (!Array.isArray(row.changes) || row.changes.length !== changes.length) throw new Error("培元丹变化列表不完整");
	for (const change of row.changes) if (!change || typeof change.attribute !== "string" || ![
		"strength",
		"intelligence",
		"constitution",
		"agility",
		"luck"
	].includes(change.attribute) || change.newValue - change.oldValue !== change.change) throw new Error("培元丹原属性变化无效");
	return value;
}
function decision(confirm) {
	const outcome = confirm ? "confirmed" : "cancelled";
	return mutation(confirm ? "仅确认原培元丹引用绑定的预览；过期、属性变化或预览被替换时拒绝。SQL结算与原回执一起提交，原引用重试返回原结果，不重新抽取、不再扣丹药。" : "仅取消原培元丹引用绑定的预览；已消耗丹药不返还。原预览已确认或被替换时拒绝，不取消最新的其他预览。", confirm ? "peiyuan.confirm" : "peiyuan.cancel", object({ reference: confirmationReferenceSchema }), object({
		outcome: {
			type: "string",
			enum: [outcome]
		},
		message: text,
		pending
	}), (input) => `/${confirm ? "确认培元丹" : "取消培元丹"} ${input.reference}`, (data) => {
		const row = data;
		if (row?.outcome !== outcome || typeof row.message !== "string" || !row.message) throw new Error("培元丹原决定回执不完整");
		return {
			...row,
			pending: decodePending(row.pending)
		};
	}, (input) => ({ reference: input.reference }), (input) => validateConfirmationReference(input.reference, "p"));
}
const peiyuanActions = {
	get_peiyuan_confirmation: mutation("为 consume_item 返回的培元丹原 snapshot 获取服务端引用和完整原预览，不服药、不应用属性。必须核对返回的原变化后使用该 reference 确认或取消；原60秒时限不延长，引用保留24小时供已结算重试。缺 snapshot 必须重新核对原结果，不能自动选最新记录。", "peiyuan.confirm", object({ snapshot: {
		type: "string",
		minLength: 64,
		maxLength: 64
	} }), object({
		reference: confirmationReferenceSchema,
		expiresAt: text,
		pending
	}), () => "/确认培元丹", (data, input) => {
		const row = data;
		if (!row || typeof row.reference !== "string" || typeof row.expiresAt !== "string" || !Number.isFinite(Date.parse(row.expiresAt))) throw new Error("培元丹引用预览不完整");
		validateConfirmationReference(row.reference, "p");
		const original = decodePending(row.pending);
		if (original.snapshot !== input.snapshot) throw new Error("培元丹引用与原预览不匹配");
		return {
			...row,
			pending: original
		};
	}, (input) => ({
		preview: true,
		snapshot: input.snapshot
	}), (input) => {
		if (!/^[a-f0-9]{64}$/.test(input.snapshot)) throw new ExposeError("INVALID_INPUT", "请使用原培元丹预览返回的完整摘要");
	}),
	confirm_peiyuan_pill: decision(true),
	cancel_peiyuan_pill: decision(false)
};

//#endregion
export { peiyuanActions };