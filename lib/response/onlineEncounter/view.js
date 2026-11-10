import { buildBubble } from "../presentation/bubble.js";
import { resultBubble } from "../presentation/presets.js";
import { formatGameTime } from "../../utils/gameTime.js";
import "../presentation/index.js";

//#region src/response/onlineEncounter/view.ts
function parseEncounter(value) {
	if (value === null) return null;
	const event = Object.assign({}, value);
	if (typeof event?.id !== "string" || !/^[1-9]\d{0,19}$/.test(event.id) || typeof event.title !== "string" || typeof event.intro !== "string" || !Array.isArray(event.options) || event.options.length !== 2 || event.options.some((label) => typeof label !== "string") || typeof event.expiresAt !== "string" || !Number.isFinite(Date.parse(event.expiresAt))) throw new Error("奇遇响应不完整");
	return {
		id: event.id,
		title: event.title,
		intro: event.intro,
		options: [event.options[0], event.options[1]],
		expiresAt: event.expiresAt
	};
}
function parseEncounterReceipt(value) {
	const receipt = value;
	if (typeof receipt?.title !== "string" || typeof receipt.reveal !== "string" || typeof receipt.reward?.name !== "string" || !Number.isSafeInteger(receipt.reward.quantity) || receipt.reward.quantity <= 0) throw new Error("奇遇结算响应不完整");
	return {
		title: receipt.title,
		reveal: receipt.reveal,
		reward: receipt.reward
	};
}
function encounterBubble(e, event) {
	return buildBubble({
		isPrivate: e.isPrivate,
		bid: e.UserId,
		title: `奇遇 · ${event.title}`,
		sections: [{
			lines: [event.intro, `时间：${formatGameTime(event.expiresAt)}前可选`],
			actions: event.options.map((label, index) => ({
				label,
				autoEnter: true,
				command: `/奇遇选择 ${event.id} ${index + 1}`
			}))
		}],
		bar: false
	});
}
function encounterReceiptBubble(e, receipt) {
	return resultBubble({
		isPrivate: e.isPrivate,
		bid: e.UserId,
		title: `奇遇结果 · ${receipt.title}`,
		status: "done",
		lines: [`结果：${receipt.reveal}`],
		rewards: [`${receipt.reward.name} ×${receipt.reward.quantity}`]
	});
}

//#endregion
export { encounterBubble, encounterReceiptBubble, parseEncounter, parseEncounterReceipt };