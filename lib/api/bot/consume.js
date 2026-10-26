import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/consume.ts
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
const positiveInteger = (value) => integer(value) && value > 0;
const nonNegativeInteger = (value) => integer(value) && value >= 0;
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("消耗道具响应不完整");
	return value;
}
function parsePeiyuanPending(value) {
	const pending = record(value);
	const view = record(pending.view);
	if (!positiveInteger(pending.quantity) || typeof view.headingText !== "string" || typeof view.hasChanges !== "boolean" || !Array.isArray(view.changeLines) || view.changeLines.some((line) => typeof line !== "string") || view.hasChanges !== view.changeLines.length > 0 || typeof view.showRollDetails !== "boolean" || !Array.isArray(view.rollLines) || view.rollLines.some((line) => typeof line !== "string") || view.showRollDetails !== view.rollLines.length > 0 || typeof view.confirmPromptText !== "string" || pending.quantity > 1 && view.headingText.length === 0) throw new Error("培元丹待确认响应不完整");
	return pending;
}
function parseMingwuSelection(value) {
	const data = record(value);
	if (!positiveInteger(data.quantity) || !nonNegativeInteger(data.remainingCount) || typeof data.guidanceText !== "string" || !Array.isArray(data.books)) throw new Error("明悟丹待选择响应不完整");
	for (const value of data.books) {
		const book = record(value);
		if (!positiveInteger(book.skillBookId) || typeof book.name !== "string" || !integer(book.proficiency) || typeof book.canSelect !== "boolean" || typeof book.statusText !== "string") throw new Error("明悟丹待选择响应不完整");
	}
	return data;
}
async function consumeBackendItem(bid, uid, input, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseConsumeResult(await requestBackend(bid, "post_players_id_consume", {
		path: { id: uid },
		body: input,
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}
function parseConsumeResult(input) {
	const value = record(input);
	if (typeof value.outcome !== "string" || ![
		"consumed",
		"rejected",
		"formation_activated",
		"tower_reset",
		"peiyuan_pending",
		"mingwu_select"
	].includes(value.outcome) || typeof value.message !== "string") throw new Error("消耗道具响应不完整");
	if (value.remainingQuantity !== void 0 && !nonNegativeInteger(value.remainingQuantity)) throw new Error("消耗道具响应不完整");
	return value;
}

//#endregion
export { consumeBackendItem, parseConsumeResult, parseMingwuSelection, parsePeiyuanPending };