import { getAppConfig } from "../utils/appConfig.js";
import { assertChannelRobotEvent } from "../api/bot/config.js";
import { createBackendRequestContext } from "../api/bot/context.js";
import { normalizeRobotBid } from "../api/bot/robot-bid.js";
import { fetchBackendRobotIdentity } from "../api/bot/identity.js";
import { isGameEventEnabled } from "../utils/eventPolicy.js";
import { ExposeError, getCurrentEvent } from "alemonjs";

//#region src/expose/access.ts
/** 可选白名单限制框架识别的调用插件；不是模型参数或玩家 UID 授权。 */
function authorizedEvent(context) {
	const config = getAppConfig().expose;
	const event = getCurrentEvent();
	const allowed = config?.allowed_callers;
	if (config !== void 0 && (!config || typeof config !== "object" || Array.isArray(config)) || config?.enabled !== void 0 && config.enabled !== true || allowed !== void 0 && (!Array.isArray(allowed) || !allowed.every((item) => typeof item === "string" && item.length > 0 && item.trim() === item)) || !context.callerApp || allowed !== void 0 && !allowed.includes(context.callerApp) || !event || !["message.create", "private.message.create"].includes(event.name) || event.Platform !== "qq-bot" || !isGameEventEnabled(event)) throw new ExposeError("FORBIDDEN", "当前调用方或消息事件未获修仙查询授权");
	try {
		assertChannelRobotEvent(event);
		normalizeRobotBid(event.UserId);
	} catch {
		throw new ExposeError("FORBIDDEN", "当前平台身份不可用于修仙查询");
	}
	return event;
}
async function currentPlayer(context) {
	const event = authorizedEvent(context);
	const bid = normalizeRobotBid(event.UserId);
	context.signal.throwIfAborted();
	const request = {
		...createBackendRequestContext(event),
		signal: context.signal
	};
	const identity = await fetchBackendRobotIdentity(bid, request);
	context.signal.throwIfAborted();
	if (identity.account.status !== "registered" || !identity.account.playerId) throw new ExposeError("FORBIDDEN", "当前平台账号尚未绑定游戏角色");
	return {
		bid,
		uid: identity.account.playerId,
		request
	};
}
function authorize(_input, context) {
	authorizedEvent(context);
	return true;
}

//#endregion
export { authorize, authorizedEvent, currentPlayer };