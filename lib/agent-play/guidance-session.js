import { getCurrentEvent } from "alemonjs";

//#region src/agent-play/guidance-session.ts
const sessions = /* @__PURE__ */ new Map();
const key = (event) => JSON.stringify([
	event.Platform,
	event.BotId,
	event.ChannelId,
	event.UserId
]);
function guidanceSession(event = getCurrentEvent() ?? {}) {
	const id = key(event);
	const session = sessions.get(id);
	if (session && Date.now() - session.updated > 18e5) {
		sessions.delete(id);
		return;
	}
	return session;
}
function rememberGuidance(state, narrator = "系统") {
	const event = getCurrentEvent();
	if (!event?.UserId) return;
	const id = key(event);
	const previous = guidanceSession(event);
	sessions.delete(id);
	sessions.set(id, {
		selectedPlayTopic: previous?.selectedPlayTopic,
		dialogueChoices: previous?.dialogueChoices,
		dialogueMessageId: previous?.dialogueMessageId,
		play: previous?.play,
		lastGameMessageId: event.MessageId,
		replyReferences: previous?.replyReferences,
		offers: previous?.offers,
		receipts: previous?.receipts,
		mode: previous?.mode ?? "guidance",
		registrationName: state?.accountExists ? void 0 : previous?.registrationName,
		narrator,
		state,
		updated: Date.now(),
		exchanges: previous?.exchanges ?? []
	});
	if (sessions.size > 1e3) sessions.delete(sessions.keys().next().value);
}
function noteGuidance(text, event = getCurrentEvent() ?? {}) {
	const session = guidanceSession(event);
	if (!session) return;
	session.updated = Date.now();
	session.exchanges.push(text.slice(0, 2e3));
	session.exchanges = session.exchanges.slice(-8);
}
function endGuidance(event) {
	sessions.delete(key(event));
}
function rememberRegistrationName(name) {
	const session = guidanceSession();
	if (session) {
		session.registrationName = name;
		noteGuidance("服务端已核对道号：" + name + "；尚未创建角色，等待玩家选择性别。");
	}
}
function isGuidanceRequest(text) {
	return !/^\s*[/#!！＃]/u.test(text) && (Boolean(guidanceSession()) || /修仙|道号|序章|新手引导|登记角色|注册角色|带我修行/u.test(text));
}
function rememberGameplay(action, result, narrator = "系统", input, topic) {
	if (!guidanceSession()) rememberGuidance({
		protocol: "plugin-play.v1",
		action
	}, narrator);
	const session = guidanceSession();
	if (!session) return;
	session.mode = "gameplay";
	const row = result;
	const serializedInput = input === void 0 ? "" : JSON.stringify(input);
	session.play = {
		topic: topic ?? session.selectedPlayTopic ?? session.play?.topic,
		lastAction: action,
		argumentsJson: serializedInput.length > 12e3 ? "" : serializedInput,
		outcome: row?.ok === true && row.data?.success !== false ? "returned" : row?.error?.outcome ?? "rejected_or_unknown"
	};
	session.lastGameMessageId = getCurrentEvent()?.MessageId;
	const serialized = JSON.stringify(result) ?? "null";
	let receipt = JSON.stringify({
		action,
		...input !== void 0 && serializedInput.length <= 12e3 ? { arguments: input } : {},
		...serializedInput.length > 12e3 ? { argumentsOmitted: true } : {},
		receipt: serialized.length <= 12e3 ? result : {
			omitted: true,
			reason: "结果较大，后续操作前重新查询对应玩法。"
		}
	});
	if (receipt.length > 12e3) receipt = JSON.stringify({
		action,
		outcome: session.play.outcome,
		omitted: true,
		reason: "调用参数与回执较大，后续操作前重新查询原结果；不能据此重复提交。"
	});
	session.receipts = [...session.receipts ?? [], receipt];
	while (session.receipts.length > 8 || session.receipts.join("").length > 16e3) session.receipts.shift();
	noteGuidance(`玩法回执：${action}，具体结果见工具回执数据。`);
}
/** Delivered game reply identities only; never a business authorization. */
function rememberGameReply(receipt, event = getCurrentEvent() ?? {}) {
	const session = guidanceSession(event);
	if (!session || !receipt?.id) return;
	session.replyReferences = [...new Set([
		...session.replyReferences ?? [],
		receipt.id,
		receipt.referenceId
	].filter((id) => typeof id === "string" && Boolean(id)))].slice(-32);
}
function gameConversationContinuation() {
	const session = guidanceSession();
	const state = session?.state;
	return {
		active: Boolean(session),
		...typeof state?.flow === "string" ? { flow: state.flow } : {},
		hasNameDraft: Boolean(session?.registrationName),
		choices: [.../* @__PURE__ */ new Set([...state?.dialogue?.choices ?? [], ...session?.dialogueChoices ?? []])].filter((choice) => typeof choice === "string").slice(0, 100)
	};
}
/** Record only navigation text that has an actual successful platform receipt. */
function rememberDeliveredDialogue(text) {
	const session = guidanceSession();
	if (!session) return;
	const messageId = getCurrentEvent()?.MessageId;
	const previous = session.dialogueMessageId === messageId ? session.dialogueChoices ?? [] : [];
	const labels = [...text.matchAll(/\[\[([^\]\n[]{1,24})\]\]/gu)].map((match) => match[1].trim()).filter((label) => label && !/^[/#!！＃]/u.test(label));
	session.dialogueChoices = [.../* @__PURE__ */ new Set([...previous, ...labels])].slice(0, 100);
	session.dialogueMessageId = messageId;
}

//#endregion
export { endGuidance, gameConversationContinuation, guidanceSession, isGuidanceRequest, noteGuidance, rememberDeliveredDialogue, rememberGameReply, rememberGameplay, rememberGuidance, rememberRegistrationName };