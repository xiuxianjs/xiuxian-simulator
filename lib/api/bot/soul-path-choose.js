import { requestBackend, writeContext } from "./client.js";
import { parseSoulPathReceipt } from "../schemas/soul-path-receipt.js";

//#region src/api/bot/soul-path-choose.ts
const row = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
function parseSoulChoosePreview(value) {
	const data = row(value);
	if (typeof data.token !== "string" || !/^[0-9a-f-]{36}$/.test(data.token) || typeof data.message !== "string") throw new Error("道途选择预览响应不完整");
	return {
		token: data.token,
		message: data.message
	};
}
function parseSoulChooseResult(value) {
	return parseSoulPathReceipt(value, "道途选择确认响应不完整");
}
async function previewBackendSoulPathChoose(bid, uid, pathKey, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseSoulChoosePreview(await requestBackend(bid, "post_players_id_soul_path_choose_preview", {
		path: { id: uid },
		body: { pathKey },
		...writeContext(request)
	}));
}
async function confirmBackendSoulPathChoose(bid, uid, token, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseSoulChooseResult(await requestBackend(bid, "post_players_id_soul_path_choose_confirm", {
		path: { id: uid },
		body: { token },
		...writeContext(request)
	}));
}

//#endregion
export { confirmBackendSoulPathChoose, parseSoulChoosePreview, parseSoulChooseResult, previewBackendSoulPathChoose };