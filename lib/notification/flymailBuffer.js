import { Format } from "alemonjs";
import { AsyncLocalStorage } from "node:async_hooks";

//#region src/notification/flymailBuffer.ts
const FLYMAIL_BUFFER_MS = 2e3;
const FLYMAIL_BATCH_LIMIT = 5;
const MAX_BATCH_SIZE = 12e3;
const context = new AsyncLocalStorage();
const batches = /* @__PURE__ */ new Map();
const sending = /* @__PURE__ */ new Map();
const withFlyMailBuffer = (send) => context.run(true, send);
function flush(key, batch) {
	if (batches.get(key) !== batch) return;
	batches.delete(key);
	clearTimeout(batch.timer);
	const markdown = Format.createMarkdown();
	for (const [index, item] of batch.items.entries()) {
		if (index) markdown.addNewline().addNewline();
		for (const block of item.data) if (block.type === "Markdown") markdown.value.value.push(...block.value);
		else if (block.type === "Text") markdown.addText(block.value);
	}
	const data = batch.items.length === 1 ? batch.items[0].data : Format.create().addMarkdown(markdown).value;
	const delivery = (sending.get(key) ?? Promise.resolve()).catch(() => {}).then(() => batch.send(data));
	sending.set(key, delivery);
	delivery.then(() => batch.items.forEach((item) => item.resolve()), (error) => batch.items.forEach((item) => item.reject(error))).finally(() => {
		if (sending.get(key) === delivery) sending.delete(key);
	});
}
/** 仅飞信调用链启用；实际目标相同才合并，成功/失败由所有原事件分别确认。 */
function bufferFlyMailSend(target, data, send) {
	if (!context.getStore() || !data.every((block) => block.type === "Markdown" || block.type === "Text")) return send(data);
	const size = JSON.stringify(data).length;
	const key = JSON.stringify([
		target.platform,
		target.BotId ?? "",
		target.scope,
		target.targetId
	]);
	let batch = batches.get(key);
	if (batch && batch.size + size > MAX_BATCH_SIZE) {
		flush(key, batch);
		batch = void 0;
	}
	if (size > MAX_BATCH_SIZE) return send(data);
	if (!batch) {
		const created = {
			items: [],
			size: 0,
			send,
			timer: setTimeout(() => flush(key, created), FLYMAIL_BUFFER_MS)
		};
		batches.set(key, created);
		batch = created;
	}
	const current = batch;
	const result = new Promise((resolve, reject) => current.items.push({
		data,
		resolve,
		reject
	}));
	current.size += size;
	if (current.items.length >= 5) flush(key, current);
	return result;
}

//#endregion
export { FLYMAIL_BATCH_LIMIT, FLYMAIL_BUFFER_MS, bufferFlyMailSend, withFlyMailBuffer };