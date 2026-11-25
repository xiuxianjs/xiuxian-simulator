import { getAppConfig } from "../utils/appConfig.js";
import { getBackendConfig } from "../api/bot/config.js";
import { commandText } from "../utils/commandPrefix.js";
import { markdownButtonLabel } from "../utils/buttonLabel.js";
import { FormatGui, addOptions } from "../utils/messageHelper.js";
import { NotificationReceiptLookupUnavailableError, isRetryableNotificationRequestError } from "../api/bot/notification-error.js";
import { NotificationMemberAvailabilityUnavailableError, acquirePlatformDeliveryLease, claimCommunityNotification, memberAvailabilityBatchSize, readCommunitySettings, readPlatformAvailability, readPlatformMemberAvailability } from "../api/bot/notification-cache.js";
import { platformObservationOutbox } from "./platformObservationOutbox.js";
import { NotificationProbeDeferredError, notificationChannel, refreshNotificationPermission } from "./channel.js";
import { formatGameTime } from "../utils/gameTime.js";
import { requireCommunityBotAdministrator } from "./community.js";
import { notificationDeliveryReceipt } from "./deliveryReceipt.js";
import { Format, getConfigValue, logger } from "alemonjs";
import { createHash } from "crypto";

//#region src/notification/communityDelivery.ts
const memberAvailabilityConcurrency = 8;
const welcomeScenes = [
	"山门风铃轻响，又有道友踏云而来。",
	"云间传来脚步声，仙途又添一位同行人。",
	"洞府外清风拂过，一段新的相逢就此开始。"
];
/** 平台事件批次不进入玩家游戏历史，不猜测成员的私聊目标。 */
function buildCommunityBatch(batch) {
	if (batch.kind === "shop-raid") {
		const { id, departureAt, nextGuardSeat, noPaidGuard, manifest } = batch.convoy;
		const quote = Format.createMarkdown();
		const cargo = manifest.map((item) => {
			return `${item.name?.length ? item.name : item.currency === "SPIRIT_STONE" ? "灵石" : item.currency === "SPIRIT_CRYSTAL" ? "灵晶" : item.effectCode ?? `货物 #${item.templateId}`} ×${item.quantity}`;
		});
		quote.addText(cargo.join("、")).addNewline();
		quote.addText(`启程：${formatGameTime(departureAt)}`).addNewline();
		addOptions(quote, [
			...!noPaidGuard && nextGuardSeat ? [{
				label: "加入护卫",
				command: `/加入商运护卫 ${id} ${nextGuardSeat}`
			}] : [],
			{
				label: "创队伍",
				command: "/打劫队 创建"
			},
			{
				label: "查看商队",
				command: `/商运 ${id}`
			}
		]);
		return FormatGui({
			mention: false,
			bar: false,
			title: "万宝楼商队｜护卫招募中",
			content: Format.createMarkdown().addBlockquote(quote)
		}).format.value;
	}
	const members = [...new Set(batch.items)];
	const count = members.length;
	const quote = Format.createMarkdown();
	if (batch.kind === "welcome") {
		const scene = createHash("sha256").update(batch.eventId).digest().readUInt32BE(0) % welcomeScenes.length;
		quote.addText(count === 1 ? welcomeScenes[scene] : `今日山门热闹，迎来 ${count} 位道友。`).addNewline().addNewline();
		if (count === 1) quote.addText("欢迎 ");
		members.forEach((id, index) => {
			if (index > 0) quote.addText(" ");
			quote.addMention(id);
		});
		quote.addText(count === 1 ? "，愿你在此结识同道，共赴仙途。" : "").addNewline();
		if (count > 1) quote.addNewline().addText("仙途漫漫，往后便有同道同行。").addNewline();
		quote.addNewline();
		addOptions(quote, [{
			label: "踏入仙途",
			command: "/踏入仙途"
		}, {
			label: "玩法大厅",
			command: "/我的活动"
		}]);
		quote.addNewline();
		addOptions(quote, [{
			label: "关闭",
			command: "/配置群欢迎 关闭"
		}]);
	} else {
		quote.addText(`收到 ${count} 条加群申请事件，请管理员在 QQ 群管理中核实与处理。`).addNewline();
		quote.addText("事件记录不代表申请仍待审核；不会自动审批。").addNewline();
		quote.addButton(markdownButtonLabel("申请记录"), { data: commandText("加群申请记录") });
	}
	return FormatGui({
		mention: false,
		bar: false,
		title: batch.kind === "welcome" ? count === 1 ? "仙途来客" : "同道相逢" : "修仙 · 加群申请",
		content: Format.createMarkdown().addBlockquote(quote)
	}).format.value;
}
async function availableWelcomeMembers(target, ids) {
	const available = [];
	let useBatchRead = ids.length > memberAvailabilityConcurrency;
	for (let offset = 0; offset < ids.length;) {
		if (useBatchRead) {
			const members = ids.slice(offset, offset + 64);
			const flags = await readPlatformMemberAvailability(target, members);
			if (flags !== null) {
				available.push(...members.filter((_, index) => flags[index]));
				offset += members.length;
				continue;
			}
			useBatchRead = false;
		}
		const members = ids.slice(offset, offset + memberAvailabilityConcurrency);
		const results = await Promise.allSettled(members.map((id) => readPlatformAvailability(target, id)));
		for (const [index, result] of results.entries()) {
			if (result.status === "rejected") throw result.reason;
			if (result.value?.available === true) available.push(members[index]);
		}
		offset += members.length;
	}
	return available;
}
async function deliverBatch(batch, consumer) {
	const settings = await readCommunitySettings(batch.target);
	const enabled = batch.kind === "shop-raid" ? settings.shopRaidEnabled : batch.kind === "welcome" ? settings.welcomeEnabled : settings.requestReminders;
	const expired = () => batch.kind === "shop-raid" && !(Date.now() < Date.parse(batch.convoy.departureAt));
	if (getAppConfig()?.close_proactive_message || !enabled || expired()) return false;
	if ((await readPlatformAvailability(batch.target))?.available === false) return false;
	const permission = await refreshNotificationPermission(batch.target, false, true);
	if (permission?.state === "blocked") return false;
	if (permission?.state !== "allowed") throw new NotificationProbeDeferredError("群主动消息权限暂时无法确认");
	if (permission.retryAt && permission.retryAt > Date.now()) throw new NotificationProbeDeferredError("群通知通道仍在失败冷却中");
	let items = [...new Set(batch.items)];
	if (batch.kind === "welcome") items = await availableWelcomeMembers(batch.target, items);
	else if (batch.kind === "request") await requireCommunityBotAdministrator(batch.target);
	if (items.length === 0 || expired()) return false;
	if (batch.kind === "shop-raid" && !await acquirePlatformDeliveryLease(batch.eventId, consumer)) return false;
	if (expired()) return false;
	try {
		await notificationChannel.send(batch.target, buildCommunityBatch({
			...batch,
			items
		}), permission);
	} catch (error) {
		if (!isRetryableNotificationRequestError(error)) await notificationChannel.recordFailure(batch.target).catch((cacheError) => logger.error("群平台通知失败状态保存失败", cacheError));
		throw error;
	}
	return true;
}
let running = false;
let pending = false;
async function dispatchCommunityNotifications() {
	pending = true;
	if (running) return;
	running = true;
	try {
		while (pending) {
			pending = false;
			const values = getConfigValue() ?? {};
			const config = {
				...values["qq-bot"],
				...values["@alemonjs/qq-bot"]
			};
			const botIds = config.bots ? Object.keys(config.bots) : config.app_id ? [String(config.app_id)] : [];
			const backend = getBackendConfig();
			const selectedBotIds = backend.channelMode ? botIds.filter((id) => id === backend.channelBotId) : botIds;
			if (backend.channelMode && selectedBotIds.length === 0) throw new Error("渠道通知机器人未在 QQ 平台配置中启用");
			const failure = (await Promise.allSettled(selectedBotIds.map(async (botId) => {
				for (let processed = 0; processed < 10; processed++) {
					if (getBackendConfig().notificationQueueScope !== backend.notificationQueueScope) return;
					const claim = await claimCommunityNotification(botId);
					if (!claim) break;
					const { batch, consumer, clearRecovery } = claim;
					if (getBackendConfig().notificationQueueScope !== backend.notificationQueueScope) {
						await platformObservationOutbox.recordCommunityFinish(backend.notificationQueueScope, batch.eventId, consumer, true, true);
						clearRecovery?.();
						return;
					}
					let sent = false;
					let retry = false;
					let deferred = false;
					try {
						const receipt = notificationDeliveryReceipt(batch.eventId);
						if (!await receipt.read()) {
							sent = await deliverBatch(batch, consumer);
							if (sent) await receipt.save({
								route: "group",
								reason: "sent"
							});
						}
					} catch (error) {
						retry = true;
						const unavailableBeforeSend = !sent && (error instanceof NotificationReceiptLookupUnavailableError || error instanceof NotificationMemberAvailabilityUnavailableError || isRetryableNotificationRequestError(error));
						deferred = unavailableBeforeSend || error instanceof NotificationProbeDeferredError;
						if (unavailableBeforeSend) logger.warn("群平台通知发送前依赖不可用，延期重试", error);
						else if (!deferred) logger.warn("群平台通知等待重试", error instanceof Error ? error.message : "未知错误");
					}
					await platformObservationOutbox.recordCommunityFinish(backend.notificationQueueScope, batch.eventId, consumer, retry, deferred);
					clearRecovery?.();
					if (processed === 9) pending = true;
				}
			}))).find((result) => result.status === "rejected");
			if (failure?.status === "rejected") throw failure.reason;
		}
	} finally {
		running = false;
	}
}

//#endregion
export { buildCommunityBatch, dispatchCommunityNotifications };