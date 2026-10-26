import { requestBackend, writeContext } from "./client.js";
import { parseRobotFlyMailHome } from "./fly-mail-queries.js";

//#region src/api/bot/flymail-send.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("飞信发送接口响应不完整");
	return value;
}
async function sendBackendFlyMail(params) {
	if (!params.bid?.trim() || !Number.isSafeInteger(params.uid) || params.uid <= 0) throw new Error("飞信发送缺少平台身份");
	if (![
		"friend",
		"master",
		"guild",
		"companion",
		"team",
		"world"
	].includes(params.scope) || typeof params.content !== "string") throw new Error("飞信发送参数无效");
	if (params.targetUid !== void 0 && (!Number.isSafeInteger(params.targetUid) || params.targetUid < 0)) throw new Error("飞信发送目标参数无效");
	return parseBackendFlyMailSend(record(await requestBackend(params.bid, "post_players_id_flymail", {
		path: { id: params.uid },
		body: {
			scope: params.scope,
			content: params.content,
			...params.targetUid ? { targetUid: params.targetUid } : {}
		},
		...writeContext(params.request)
	})));
}
function parseBackendFlyMailSend(value) {
	const data = record(value);
	if (data.success !== true || typeof data.message !== "string" || !data.message) throw new Error("飞信发送接口响应不完整");
	return { message: data.message };
}
function parseRobotFlyMailSend(value) {
	const result = parseBackendFlyMailSend(value);
	let chat;
	try {
		const data = record(value);
		if (data.chat !== void 0 && data.chat !== null) {
			const view = record(data.chat);
			const conversationId = view.conversationId;
			const targetUid = view.targetUid;
			if (typeof conversationId !== "number" || !Number.isSafeInteger(conversationId) || conversationId <= 0 || typeof targetUid !== "number" || !Number.isSafeInteger(targetUid) || targetUid <= 0) throw new Error("飞信会话数据不完整");
			const history = parseRobotFlyMailHome(view.history, "friend");
			if (!history.list.length || history.list.some((item) => item.conversationId !== conversationId)) throw new Error("飞信会话数据不完整");
			chat = {
				targetUid,
				history
			};
		}
	} catch {}
	const data = record(value);
	const positive = (value) => typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : void 0;
	return {
		...result,
		chat,
		targetUid: positive(data.targetUid),
		conversationId: positive(data.conversationId)
	};
}

//#endregion
export { parseBackendFlyMailSend, parseRobotFlyMailSend, sendBackendFlyMail };