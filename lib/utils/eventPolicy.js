import { getAppConfig } from "./appConfig.js";

//#region src/utils/eventPolicy.ts
/** 只控制修仙包的事件处理，不修改框架或其他插件的事件配置。 */
function isGameEventEnabled(event) {
	const policy = getAppConfig().events;
	if (policy === void 0) return true;
	if (!policy || typeof policy !== "object" || Array.isArray(policy)) return false;
	const { allow, deny } = policy;
	const valid = (value) => Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);
	if (allow !== void 0 && !valid(allow) || deny !== void 0 && !valid(deny)) return false;
	const matches = (rules) => rules.some((rule) => {
		const key = rule.trim();
		return key === event.name || event.Notice?.type !== void 0 && key === `${event.name}:${event.Notice.type}`;
	});
	return !(deny && matches(deny)) && (allow === void 0 || matches(allow));
}

//#endregion
export { isGameEventEnabled };