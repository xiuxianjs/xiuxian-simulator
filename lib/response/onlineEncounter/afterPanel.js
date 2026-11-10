import { getBackendConfig } from "../../api/bot/config.js";
import { getEventBackendRobotIdentity } from "../../api/bot/identity.js";
import { requestRobotBusiness } from "../../api/bot/robot-business.js";
import { encounterBubble, parseEncounter } from "./view.js";
import { ResultCode } from "alemonjs";
import { randomUUID } from "node:crypto";

//#region src/response/onlineEncounter/afterPanel.ts
const panelCommands = {
	profile: /^(我|我的信息|我的资料|我的编号|我的控制台|个人信息|个人资料|个人编号|个人控制台)$/,
	attributes: /^(更新属性|属性面板|我的面板)$/,
	cave: /^(我的洞府|洞府)$/,
	guild: /^(我的宗门|查看势力)$/,
	activity: /^(我的活动|个人活动|活动大厅)$/,
	storyline: /^(查看主线|副本列表|主线列表)$/
};
const schedules = /* @__PURE__ */ new Map();
const checking = /* @__PURE__ */ new Set();
function parseCheck(value) {
	const result = value;
	const nextCheckAt = typeof result?.nextCheckAt === "string" ? Date.parse(result.nextCheckAt) : NaN;
	const nextGameDayAt = typeof result?.nextGameDayAt === "string" ? Date.parse(result.nextGameDayAt) : NaN;
	if (typeof result?.triggered !== "boolean" || typeof result.quotaExhausted !== "boolean" || !Number.isFinite(nextCheckAt) || !Number.isFinite(nextGameDayAt)) throw new Error("奇遇排期响应不完整");
	const pending = parseEncounter(result.pending);
	if (result.triggered && !pending) throw new Error("奇遇选项缺失");
	return {
		triggered: result.triggered,
		pending,
		nextCheckAt,
		nextGameDayAt,
		quotaExhausted: result.quotaExhausted
	};
}
function cacheUntil(key, at) {
	schedules.delete(key);
	schedules.set(key, at);
	if (schedules.size > 1e4) {
		const oldest = schedules.keys().next().value;
		if (oldest !== void 0) schedules.delete(oldest);
	}
}
async function checkEncounterAfterPanel(e, panel, message, sent) {
	const command = (e.MessageText ?? "").trim().replace(/^[!！/#＃]/, "");
	await sent.then(async (receipts) => {
		if (!panelCommands[panel].test(command) || !receipts.length || receipts.some((receipt) => receipt.code !== ResultCode.Ok)) return;
		const { account } = await getEventBackendRobotIdentity(e);
		if (!account.playerId) return;
		const key = `${getBackendConfig().scope}:${account.playerId}`;
		if (checking.has(key) || (schedules.get(key) ?? 0) > Date.now()) return;
		checking.add(key);
		try {
			const requestId = randomUUID();
			const result = await requestRobotBusiness(e, "online-encounter.check", { panel }, parseCheck, {
				requestId,
				idempotencyKey: requestId
			});
			if (!result.success || result.branch !== "business") {
				cacheUntil(key, Date.now() + 3e4);
				return;
			}
			const { triggered, pending, nextCheckAt, nextGameDayAt, quotaExhausted } = result.data;
			cacheUntil(key, quotaExhausted ? nextCheckAt : Math.min(nextCheckAt, nextGameDayAt));
			if (triggered && pending) await message.send(encounterBubble(e, pending));
		} catch {
			if ((schedules.get(key) ?? 0) <= Date.now()) cacheUntil(key, Date.now() + 3e4);
		} finally {
			checking.delete(key);
		}
	}).catch(() => void 0);
}

//#endregion
export { checkEncounterAfterPanel };