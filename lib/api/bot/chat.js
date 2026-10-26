import { getWorkerBackendConfig } from "./config.js";
import { backendConnectionPools } from "./connection-pools.js";
import axios from "axios";

//#region src/api/bot/chat.ts
async function post(path, data) {
	const config = getWorkerBackendConfig();
	if (!config.url || !config.workerToken) throw new Error("消息管理 API 未配置");
	return (await axios.create({
		...backendConnectionPools,
		baseURL: config.url,
		timeout: config.timeoutMs,
		headers: { "X-Worker-Token": config.workerToken }
	}).post(`/chat/internal/${path}`, data)).data;
}
const rememberChatContact = (botId, openId, bid) => post("contact", {
	botId,
	openId,
	bid
});
const claimChatNotice = (botId) => post("claim", { botId });
const claimNextChatNotice = (botId, scope = "c2c") => post("claim-next", {
	botId,
	scopes: [scope]
});
const finishChatNotice = (receipt) => post("receipt", receipt);
const observeChatContacts = (items) => post("contacts/observe", { items });

//#endregion
export { claimChatNotice, claimNextChatNotice, finishChatNotice, observeChatContacts, rememberChatContact };