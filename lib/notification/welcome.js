import { markdownButtonLabel } from "../utils/buttonLabel.js";
import { FormatGui } from "../utils/messageHelper.js";
import { acquirePlatformDeliveryLease, readPlatformAvailability, storePlatformDeliveryReceipt } from "../api/bot/notification-cache.js";
import { assertNotificationReceipt, readNotificationChannel, withNotificationTimeout } from "./channel.js";
import { Format } from "alemonjs";
import { createHash, randomUUID } from "crypto";

//#region src/notification/welcome.ts
const pending = /* @__PURE__ */ new Set();
/** 只回复适配器支持且带真实事件标识的欢迎/授权事件。 */
async function sendNotificationWelcome(event, send) {
	const friend = event.name === "private.friend.add";
	const joined = event.name === "guild.join";
	const permission = event.Notice?.type === "message-permission" && event.Notice.enabled;
	if (event.Platform !== "qq-bot" || !friend && !joined && !permission || !event.MessageId || !event.BotId || !event.Target) return;
	const target = {
		...event.Target,
		platform: event.Platform,
		BotId: event.BotId
	};
	if ((await readPlatformAvailability(target))?.available === false) return;
	if (permission && (await readNotificationChannel(target))?.state !== "allowed") return;
	const key = `welcome:${createHash("sha256").update(JSON.stringify([
		event.Platform,
		event.BotId,
		event.name,
		event.MessageId
	])).digest("hex")}`;
	if (pending.has(key) || !await acquirePlatformDeliveryLease(key, randomUUID())) return;
	if (pending.has(key)) return;
	pending.add(key);
	try {
		const data = buildNotificationWelcome(event);
		const result = await withNotificationTimeout(() => send(data));
		assertNotificationReceipt(result);
		await storePlatformDeliveryReceipt(key, {
			route: target.scope === "group" ? "group" : "private",
			reason: "sent"
		});
	} finally {
		pending.delete(key);
	}
}
/** 统一生成实际发送的气泡，便于布局验证。 */
function buildNotificationWelcome(event) {
	const friend = event.name === "private.friend.add";
	const joined = event.name === "guild.join";
	const target = event.Target;
	const quote = Format.createMarkdown();
	if (friend) {
		quote.addText("欢迎来到修仙世界。").addNewline();
		quote.addText("初来乍到可踏入仙途，已有角色可查看主页。").addNewline();
		quote.addButton(markdownButtonLabel("踏入仙途"), { data: "/踏入仙途" }).addText(" ").addButton(markdownButtonLabel("我的主页"), { data: "/我" }).addText(" ").addButton(markdownButtonLabel("帮助"), { data: "/帮助" }).addButton(markdownButtonLabel("登录"), { data: "/登录" });
	} else if (joined) {
		quote.addText("道友们好，我是修仙机器人，陪大家一起修行、闯秘境、争夺机缘！").addNewline().addNewline();
		quote.addText("请群主或管理员在 QQ 的机器人设置中开启：").addNewline();
		quote.addText("① 接收全部消息").addNewline();
		quote.addText("让道友们发送指令时更方便，也让机器人及时记录大家在本群的活动，帮助游戏通知找到合适的投递群。").addNewline();
		quote.addText("仅接收 @ 消息时，请先 @ 我再发送指令，普通聊天也无法用于更新活动位置。").addNewline().addNewline();
		quote.addText("② 主动消息").addNewline();
		quote.addText("用于及时发送游戏通知，包括虾仁夺宝受袭、反击机会和物品归属等提醒。").addNewline();
		quote.addText("关闭后，这些提醒无法主动送达本群；个人通知仍按各自订阅设置投递。").addNewline().addNewline();
		quote.addText("特别推荐：虾仁夺宝（打劫）是游戏主要的修为获取方式之一！").addNewline();
		quote.addText("秘境与夺宝分别使用精力、元力，可以一起参与，增加修为来源。别只刷秘境，错过另一条重要的成长途径！").addNewline();
		quote.addButton(markdownButtonLabel("帮助"), { data: "/帮助" }).addText(" ").addButton(markdownButtonLabel("踏入仙途"), { data: "/踏入仙途" }).addText(" ").addButton(markdownButtonLabel("我的设置"), { data: "/我的设置" }).addText(" ").addButton(markdownButtonLabel("登录"), { data: "/登录" });
	} else {
		quote.addText(target?.scope === "group" ? "本群已允许接收机器人主动消息。" : "本次私聊已允许接收机器人主动消息。").addNewline();
		quote.addText("后续通知将按现有设置投递。").addNewline();
		quote.addButton(markdownButtonLabel("我的设置"), { data: "/我的设置" }).addText(" ").addButton(markdownButtonLabel("我的通知"), { data: "/我的通知" }).addButton(markdownButtonLabel("登录"), { data: "/登录" });
	}
	const content = Format.createMarkdown().addBlockquote(quote);
	return FormatGui({
		isPrivate: target?.scope === "c2c",
		bid: event.UserId,
		mention: false,
		bar: false,
		title: friend ? "修仙 · 欢迎道友" : joined ? "修仙 · 入群指引" : "修仙 · 通知通道",
		content
	});
}

//#endregion
export { buildNotificationWelcome, sendNotificationWelcome };