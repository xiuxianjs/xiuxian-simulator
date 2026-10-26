import { renderAliasOverview, renderOverview, renderSlot, sendPage, sendShortcut } from "./views.js";

//#region src/response/task/common.ts
function normalizeTaskCommandText(messageText) {
	return String(messageText ?? "").trim().replace(/^(!|！|\/|#|＃)\s*/, "");
}
/** Converts the Go-confirmed task step into the existing command route. */
function toTaskRouteCommand(step) {
	const normalized = normalizeTaskCommandText(step).replace(/\s+/g, " ");
	return normalized ? `/${normalized}` : "";
}
/** Selects the same route as toTaskRouteCommand of a Go-confirmed executed
* step. The server still decides whether the input actually matches that step. */
function toTaskInputRouteCommand(input) {
	return toTaskRouteCommand(input.replace(/^(!|！|\/|#|＃)\s*/, "").trim().replace(/\s+/g, " "));
}
/** Preserve the former framework Number-to-string conversion in the request.
* Invalid input is still judged from the original message by the backend. */
function taskRouteNumberText(value) {
	return value === void 0 || value === null || value === "" ? "" : String(Number(value));
}

//#endregion
export { normalizeTaskCommandText, renderAliasOverview, renderOverview, renderSlot, sendPage, sendShortcut, taskRouteNumberText, toTaskInputRouteCommand, toTaskRouteCommand };