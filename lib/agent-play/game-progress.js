import { getCurrentEvent } from "alemonjs";

//#region src/agent-play/game-progress.ts
const progress = /* @__PURE__ */ new Map();
function key() {
	const event = getCurrentEvent();
	return event?.Platform && event.UserId ? JSON.stringify([
		event.Platform,
		event.BotId ?? "",
		event.UserId
	]) : void 0;
}
function advanceGamePresentation() {
	const id = key();
	if (!id) return;
	progress.delete(id);
	progress.set(id, {});
	if (progress.size > 1e4) progress.delete(progress.keys().next().value);
}
function captureGamePresentation() {
	const id = key();
	const initial = id ? progress.get(id) : void 0;
	return () => Boolean(id && progress.get(id) !== initial);
}

//#endregion
export { advanceGamePresentation, captureGamePresentation };