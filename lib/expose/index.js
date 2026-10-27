import { getAppConfig } from "../utils/appConfig.js";
import { assertChannelRobotEvent } from "../api/bot/config.js";
import { createBackendRequestContext } from "../api/bot/context.js";
import { normalizeRobotBid } from "../api/bot/robot-bid.js";
import { getBackendAttributePanel } from "../api/bot/attribute-panel.js";
import { fetchBackendRobotIdentity } from "../api/bot/identity.js";
import { isGameEventEnabled } from "../utils/eventPolicy.js";
import { Expose, ExposeError, getCurrentEvent } from "alemonjs";

//#region src/expose/index.ts
const GAME_EXPOSE_PROTOCOL = "xiuxian.player.v1";
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
const numericFields = [
	"strength",
	"maxStrength",
	"intelligence",
	"maxIntelligence",
	"constitution",
	"maxConstitution",
	"agility",
	"maxAgility",
	"luck",
	"maxLuck",
	"combatPower",
	"physicalAttack",
	"physicalDefense",
	"magicAttack",
	"magicDefense",
	"spiritualPower",
	"mentalPower",
	"hp",
	"speed",
	"critRate",
	"critDamage",
	"antiCritRate",
	"hitRate",
	"dodgeRate"
];
const gameExpose = Expose.create().provide({
	name: GAME_EXPOSE_PROTOCOL,
	version: "1.0.0",
	description: "当前消息玩家的只读查询；身份由平台事件与服务端解析。",
	actions: { get_attributes: Expose.action({
		description: "查询当前玩家的属性面板。数值及单位沿用服务端；不结算资源，不执行游戏操作。",
		effect: "read",
		inputSchema: {
			type: "object",
			properties: {},
			additionalProperties: false
		},
		outputSchema: {
			type: "object",
			properties: {
				uid: {
					type: "integer",
					minimum: 1
				},
				daoName: { type: "string" },
				realmName: { type: "string" },
				...Object.fromEntries(numericFields.map((key) => [key, { type: "integer" }]))
			},
			required: [
				"uid",
				"daoName",
				"realmName",
				...numericFields
			],
			additionalProperties: false
		},
		authorize: (_input, context) => {
			authorizedEvent(context);
			return true;
		},
		handler: async (_input, context) => {
			const event = authorizedEvent(context);
			const bid = normalizeRobotBid(event.UserId);
			context.signal.throwIfAborted();
			const identity = await fetchBackendRobotIdentity(bid, {
				...createBackendRequestContext(event),
				signal: context.signal
			});
			context.signal.throwIfAborted();
			if (identity.account.status !== "registered" || !identity.account.playerId) throw new ExposeError("FORBIDDEN", "当前平台账号尚未绑定游戏角色");
			const panel = await getBackendAttributePanel(bid, identity.account.playerId, context.signal);
			return {
				uid: panel.uid,
				daoName: panel.daoName,
				realmName: panel.realmName,
				...Object.fromEntries(numericFields.map((key) => [key, panel[key]]))
			};
		}
	}) }
});

//#endregion
export { GAME_EXPOSE_PROTOCOL, gameExpose };