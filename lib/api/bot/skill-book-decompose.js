import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/skill-book-decompose.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("分解功法接口响应不完整");
	return value;
}
function integer(value, field, positive = false) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < (positive ? 1 : 0)) throw new Error(`分解功法接口字段无效: ${field}`);
	return value;
}
function text(value, field) {
	if (typeof value !== "string" || !value) throw new Error(`分解功法接口字段无效: ${field}`);
	return value;
}
function item(value) {
	const row = record(value);
	return {
		itemId: integer(row.itemId, "refundedItems.itemId", true),
		name: text(row.name, "refundedItems.name"),
		quantity: integer(row.quantity, "refundedItems.quantity", true),
		expValue: integer(row.expValue, "refundedItems.expValue", true)
	};
}
async function decomposeBackendSkillBook(bid, uid, skillBookId, request, repeatCommand) {
	if (!bid) throw new Error("缺少平台身份");
	return parseBackendSkillBookDecompose(await requestBackend(bid, "post_players_id_skill_books_skillBookId_decompose", {
		path: {
			id: uid,
			skillBookId
		},
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}
function parseBackendSkillBookDecompose(value) {
	const row = record(value);
	if (!Array.isArray(row.refundedItems)) throw new Error("分解功法接口字段无效: refundedItems");
	return {
		instanceId: integer(row.instanceId, "instanceId", true),
		name: text(row.name, "name"),
		skillType: text(row.skillType, "skillType"),
		grade: text(row.grade, "grade"),
		realm: text(row.realm, "realm"),
		refundExp: integer(row.refundExp, "refundExp"),
		baseExp: integer(row.baseExp, "baseExp"),
		refundedItems: row.refundedItems.map(item)
	};
}

//#endregion
export { decomposeBackendSkillBook, parseBackendSkillBookDecompose };