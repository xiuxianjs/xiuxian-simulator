import { getBackendConfig, getNotificationBackendConfig, getWorkerBackendConfig } from "./config.js";
import { backendConnectionPools } from "./connection-pools.js";
import { notificationRequestError } from "./notification-error.js";
import axios from "axios";

//#region src/api/bot/chat.ts
async function post(path, data) {
	const channel = getBackendConfig().channelMode;
	const config = channel ? getNotificationBackendConfig() : getWorkerBackendConfig();
	if (!config.url || !channel && !config.workerToken) throw new Error("消息管理 API 未配置");
	const endpoint = `/chat/internal/${path}`;
	const headers = channel ? { Authorization: `Bearer ${config.robotAuthToken}` } : { "X-Worker-Token": config.workerToken };
	try {
		return (await axios.create({
			...backendConnectionPools,
			baseURL: config.url,
			timeout: config.timeoutMs,
			headers,
			...channel ? { maxRedirects: 0 } : {}
		}).post(endpoint, data)).data;
	} catch (error) {
		throw notificationRequestError(endpoint, error);
	}
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