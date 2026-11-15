import { notificationNavigationData } from "./presentation.js";
import { Format } from "alemonjs";
import { AsyncLocalStorage } from "node:async_hooks";

//#region src/notification/flymailBuffer.ts
const FLYMAIL_BUFFER_MS = 2e3;
const FLYMAIL_BATCH_LIMIT = 5;
const MAX_BATCH_SIZE = 12e3;
const context = new AsyncLocalStorage();
const NOTIFICATION_BUFFER_MS = 3e4;
/** 仅保存传输缓冲，权威事件及回执仍在服务端。玩家隔离避免同群串合并。 */
const withNotificationBuffer = (owner, send) => context.run({ mode: `standard:${owner}` }, send);
const batches = /* @__PURE__ */ new Map();
const sending = /* @__PURE__ */ new Map();
const withFlyMailBuffer = (send) => context.run({ mode: "flymail" }, send);
/** 群提醒单独按实际群合并，保留飞信私聊的原有缓冲方式。 */
const withFlyMailGroupReminder = (bid, send) => context.run({
	mode: context.getStore()?.mode === "flymail" ? "flymail-group" : "",
	reminderBid: bid
}, send);
function addReminderMentions(data, bids) {
	const markdown = Format.createMarkdown();
	for (const [index, bid] of [...new Set(bids)].entries()) {
		if (index) markdown.addText(" ");
		markdown.addMention(bid);
	}
	return [...Format.create().addMarkdown(markdown.addNewline()).value, ...data];
}
function batchData(items) {
	const first = items[0];
	if (first.reminderBid) return addReminderMentions(first.data, items.map((item) => item.reminderBid).filter((bid) => bid !== void 0));
	if (items.length === 1) return first.data;
	const markdown = Format.createMarkdown();
	for (const [index, item] of items.entries()) {
		if (index) markdown.addNewline().addNewline();
		for (const block of item.data) if (block.type === "Markdown") markdown.value.value.push(...block.value);
		else if (block.type === "Text") markdown.addText(block.value);
		else if (block.type === "Mention") markdown.addMention(block.value);
	}
	return Format.create().addMarkdown(markdown).value;
}
function flush(key, batch) {
	if (batches.get(key) !== batch) return;
	batches.delete(key);
	clearTimeout(batch.timer);
	const data = batchData(batch.items);
	const delivery = (sending.get(key) ?? Promise.resolve()).catch(() => {}).then(() => batch.send(notificationNavigationData(data)));
	sending.set(key, delivery);
	delivery.then(() => batch.items.forEach((item) => item.resolve()), (error) => batch.items.forEach((item) => item.reject(error))).finally(() => {
		if (sending.get(key) === delivery) sending.delete(key);
	});
}
/** 仅通知消费链启用；按玩家和实际目标合并，所有原事件分别确认。 */
function bufferFlyMailSend(target, data, send) {
	const { mode, reminderBid } = context.getStore() ?? {};
	const singleData = () => reminderBid ? addReminderMentions(data, [reminderBid]) : data;
	if (!mode) return send(singleData());
	if (!data.every((block) => block.type === "Markdown" || block.type === "Text" || block.type === "Mention")) return send(notificationNavigationData(singleData()));
	const serialized = JSON.stringify(data);
	const size = serialized.length + (reminderBid?.length ?? 0);
	const key = JSON.stringify([
		target.platform,
		target.BotId ?? "",
		target.scope,
		target.targetId,
		mode,
		reminderBid ? serialized : ""
	]);
	let batch = batches.get(key);
	if (batch && batch.size + size > MAX_BATCH_SIZE) {
		flush(key, batch);
		batch = void 0;
	}
	if (size > MAX_BATCH_SIZE) return send(notificationNavigationData(singleData()));
	if (!batch) {
		const created = {
			items: [],
			size: 0,
			send,
			timer: setTimeout(() => flush(key, created), mode.startsWith("flymail") ? FLYMAIL_BUFFER_MS : NOTIFICATION_BUFFER_MS)
		};
		batches.set(key, created);
		batch = created;
	}
	const current = batch;
	const result = new Promise((resolve, reject) => current.items.push({
		data,
		reminderBid,
		resolve,
		reject
	}));
	current.size += size;
	if (current.items.length >= 5) flush(key, current);
	return result;
}

//#endregion
export { FLYMAIL_BATCH_LIMIT, FLYMAIL_BUFFER_MS, NOTIFICATION_BUFFER_MS, bufferFlyMailSend, withFlyMailBuffer, withFlyMailGroupReminder, withNotificationBuffer };