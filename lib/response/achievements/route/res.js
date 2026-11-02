import res_default$1 from "../category/res.js";
import res_default$2 from "../claimCombatPower/res.js";
import res_default$3 from "../overview/res.js";
import res_default$4 from "../combatPower/res.js";

//#region src/response/achievements/route/res.ts
function extractExecutables(target) {
	const unwrapped = target && typeof target === "object" && "default" in target ? target.default : target;
	if (typeof unwrapped === "function") return [unwrapped];
	if (unwrapped && typeof unwrapped === "object") {
		const current = unwrapped.current;
		if (Array.isArray(current)) return current.filter((item) => typeof item === "function");
		if (typeof current === "function") return [current];
	}
	return [];
}
function runResponse(target, event, next) {
	const executables = extractExecutables(target);
	if (executables.length === 0) return next();
	let index = 0;
	const runNext = () => {
		const current = executables[index];
		index += 1;
		if (!current) return true;
		return current(event, runNext);
	};
	return runNext();
}
function getRouteText(event) {
	return String(event.__route?.text ?? event.MessageText ?? "").trim();
}
var res_default = (event, next) => {
	const tokens = getRouteText(event).split(/\s+/).filter(Boolean);
	if (tokens[0] !== "成就") return next();
	if (tokens[1] === "战力") {
		if (tokens[2] === "领取" || tokens[2] === "一键领取") return runResponse(res_default$2, event, next);
		return runResponse(res_default$4, event, next);
	}
	if (tokens.length === 1) return runResponse(res_default$3, event, next);
	return runResponse(res_default$1, event, next);
};

//#endregion
export { res_default as default };