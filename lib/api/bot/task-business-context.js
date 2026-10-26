//#region src/api/bot/task-business-context.ts
const contexts = /* @__PURE__ */ new WeakMap();
function setRobotTaskInput(event, input) {
	contexts.set(event, {
		input,
		consumed: false,
		isPrivate: event.isPrivate
	});
}
function hasPendingRobotTaskInput(event) {
	const context = contexts.get(event);
	return context !== void 0 && !context.consumed;
}
function takeRobotTaskInput(event) {
	const context = contexts.get(event);
	if (!context || context.consumed) return;
	context.consumed = true;
	return context.input;
}
function markRobotTaskCompatibilityBlocked(event) {
	const context = contexts.get(event);
	if (context) context.compatibilityBlocked = true;
}
function isRobotTaskCompatibilityBlocked(event) {
	return contexts.get(event)?.compatibilityBlocked === true;
}
function robotTaskPresentationEvent(event) {
	const context = contexts.get(event);
	return context && context.isPrivate !== event.isPrivate ? {
		...event,
		isPrivate: context.isPrivate
	} : event;
}

//#endregion
export { hasPendingRobotTaskInput, isRobotTaskCompatibilityBlocked, markRobotTaskCompatibilityBlocked, robotTaskPresentationEvent, setRobotTaskInput, takeRobotTaskInput };