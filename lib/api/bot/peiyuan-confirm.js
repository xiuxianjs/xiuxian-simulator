import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/peiyuan-confirm.ts
async function confirmBackendPeiyuan(bid, uid, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return await requestBackend(bid, "post_players_id_peiyuan_dan_confirm", {
		path: { id: uid },
		headers: repeatPresentationHeaders("确认培元丹"),
		...writeContext(request)
	});
}
function parsePeiyuanConfirm(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("培元丹确认回执不完整");
	const data = value;
	const changes = data.changes === null ? [] : data.changes;
	if (!Array.isArray(changes)) throw new Error("培元丹确认回执不完整");
	return { changes: changes.map((value) => {
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("培元丹确认回执不完整");
		const change = value;
		if (typeof change.attributeName !== "string" || !Number.isSafeInteger(change.change) || !Number.isSafeInteger(change.oldValue) || !Number.isSafeInteger(change.newValue)) throw new Error("培元丹确认回执不完整");
		return {
			attributeName: change.attributeName,
			change: change.change,
			oldValue: change.oldValue,
			newValue: change.newValue
		};
	}) };
}

//#endregion
export { confirmBackendPeiyuan, parsePeiyuanConfirm };