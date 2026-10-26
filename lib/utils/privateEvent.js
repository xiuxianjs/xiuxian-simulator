//#region src/utils/privateEvent.ts
/** 平台私聊标记优先，兼容旧游戏事件与任务展示副本。 */
function isPrivateEvent(event) {
	return event?.IsPrivate ?? (event?.name?.startsWith("private.") ? true : event?.isPrivate ?? false);
}
function normalizePrivateEvent(event) {
	event.isPrivate = isPrivateEvent(event);
}

//#endregion
export { isPrivateEvent, normalizePrivateEvent };