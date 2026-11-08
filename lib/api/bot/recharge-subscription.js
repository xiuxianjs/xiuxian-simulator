import { getAppConfig } from "../../utils/appConfig.js";
import { assertChannelRobotEvent, getBackendConfig } from "./config.js";
import { assertNotificationReceipt, getNotificationPrivateTarget, rememberNotificationTarget } from "../../notification/channel.js";
import { Format, MessageDirect, isMaster, logger } from "alemonjs";
import axios from "axios";

//#region src/api/bot/recharge-subscription.ts
async function exchange(userId, action, extra = {}) {
	const config = getBackendConfig();
	if (!config.channelMode) throw new Error("充值订阅需要配置渠道 API。");
	const endpoint = new URL(String(getAppConfig().support_api_origin ?? ""));
	if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && ["127.0.0.1", "[::1]"].includes(endpoint.hostname)) || endpoint.username || endpoint.password || endpoint.pathname !== "/" || endpoint.search || endpoint.hash) throw new Error("请配置 support_api_origin 为渠道平台 HTTPS 地址。");
	const response = await axios.post(`${endpoint.origin}/api/channel/v1/robot/recharge-subscription`, {
		appId: config.channelBotId,
		userId,
		action,
		localMaster: isMaster(userId, "qq-bot"),
		...extra
	}, {
		timeout: config.timeoutMs,
		maxRedirects: 0,
		headers: { Authorization: `Bearer ${config.robotAuthToken}` }
	});
	if (!response.data?.data || typeof response.data.data !== "object") throw new Error("充值订阅响应无效。");
	return response.data.data;
}
async function rechargeSubscriptionCommand(event, action) {
	assertChannelRobotEvent(event);
	if (!(event.IsPrivate || event.isPrivate || event.name.startsWith("private."))) throw new Error("请私聊机器人使用充值订阅。");
	await rememberNotificationTarget(event);
	if (action === "identity") return `主人平台用户标识：${event.UserId}\n机器人：${event.BotId}\n请将标识交给渠道后台设置主人。`;
	return (await exchange(event.UserId, action)).notice ?? "操作已完成。";
}
async function pollRechargeSubscriptions() {
	const config = getBackendConfig();
	if (!config.channelMode || !getAppConfig().support_api_origin) return;
	const { users = [] } = await exchange("recharge-poller", "users");
	for (const user of users) {
		const target = await getNotificationPrivateTarget("qq-bot", user, config.channelBotId);
		if (!target) continue;
		const result = await exchange(user, "poll");
		for (const delivery of result.deliveries ?? []) {
			let status = "sent";
			try {
				assertNotificationReceipt(await MessageDirect.create().sendToTarget({
					target,
					format: Format.create().addText(delivery.content)
				}));
			} catch {
				status = "unknown";
			}
			await exchange(user, "ack", {
				key: delivery.key,
				status
			});
		}
	}
}
let timer;
let generation = 0;
function startRechargeSubscriptions() {
	stopRechargeSubscriptions();
	const current = generation;
	const tick = async () => {
		try {
			await pollRechargeSubscriptions();
		} catch (error) {
			logger.error("充值提醒轮询失败", error instanceof Error ? error.message : "unknown");
		}
		if (current === generation) timer = setTimeout(() => void tick(), 1e4);
	};
	tick();
}
function stopRechargeSubscriptions() {
	generation++;
	clearTimeout(timer);
}

//#endregion
export { pollRechargeSubscriptions, rechargeSubscriptionCommand, startRechargeSubscriptions, stopRechargeSubscriptions };