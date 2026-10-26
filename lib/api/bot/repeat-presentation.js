import { getCurrentEvent } from "alemonjs";

//#region src/api/bot/repeat-presentation.ts
const receipts = /* @__PURE__ */ new WeakMap();
/** Only an exact final-text match can replace the former repeat-record call. */
function receiveRepeatPresentation(event, bid, uid, value) {
	if (!event || !Number.isSafeInteger(uid) || Number(uid) < 1 || !value || typeof value !== "object") return;
	const repeat = value.repeat;
	if (!repeat || typeof repeat !== "object") return;
	const row = repeat;
	if (row.uid !== uid || typeof row.command !== "string" || typeof row.message !== "string" || typeof row.available !== "boolean") return;
	if (row.available && (typeof row.count !== "number" || !Number.isFinite(row.count) || typeof row.suffix !== "string")) return;
	const data = row.available ? {
		count: row.count,
		suffix: row.suffix
	} : null;
	const pending = receipts.get(event) ?? [];
	pending.push({
		bid,
		uid: Number(uid),
		command: row.command,
		message: row.message,
		data
	});
	receipts.set(event, pending);
}
function consumeRepeatPresentation(bid, uid, command, message) {
	const event = getCurrentEvent();
	if (!event || event.UserId !== bid) return;
	const pending = receipts.get(event);
	const index = pending?.findIndex((row) => row.bid === bid && row.uid === uid && row.command === command && row.message === message) ?? -1;
	if (!pending || index < 0) return;
	const [row] = pending.splice(index, 1);
	return { data: row.data };
}
function repeatPresentationHeaders(command) {
	if (typeof command !== "string" || Buffer.byteLength(command, "utf8") > 4096) return {};
	return { "X-Repeat-Command": Buffer.from(command, "utf8").toString("base64") };
}

//#endregion
export { consumeRepeatPresentation, receiveRepeatPresentation, repeatPresentationHeaders };