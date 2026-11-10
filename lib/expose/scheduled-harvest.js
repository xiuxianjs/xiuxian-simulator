import { assertChannelRobotEvent, getBackendConfig } from "../api/bot/config.js";
import { BackendAPIError, requestBackend } from "../api/bot/client.js";
import { fetchBackendRobotIdentity } from "../api/bot/identity.js";
import { isGameEventEnabled } from "../utils/eventPolicy.js";
import { authorizedCaller, authorizedEvent, currentPlayer } from "./access.js";
import { boolean, integer, object, text } from "./schema.js";
import { readHarvestTicket, signHarvestTicket } from "../agent-play/scheduled-harvest-ticket.js";
import { requestedHarvestPlot } from "../agent-play/harvest-scope.js";
import { Expose, ExposeError, getCurrentEvent } from "alemonjs";
import { createHash } from "node:crypto";

//#region src/expose/scheduled-harvest.ts
const actorSchema = object({
	platform: text,
	botId: text,
	userId: text,
	channelId: text,
	private: boolean
});
const schedule = {
	dueAt: integer,
	everyMs: integer,
	expiresAt: integer
};
function fail(message) {
	throw new ExposeError("FORBIDDEN", message);
}
const scheduledHarvest = {
	name: "agent.scheduled-action.v1",
	version: "1.0.0",
	description: "修仙限定预约：只采收本人灵田，不加速、播种、照料或操作他人灵田。后台执行使用原签名授权，不接收玩家编号。",
	actions: {
		prepare: Expose.action({
			description: "仅在玩家明确要求预约本人灵田采收时签发限定授权。plotIndex必须与原话指定地块一致，未指定地块时不传；不能擅自换地块或扩大为全部。这里不保存预约、不收割，宿主保存成功后才能说已安排。时间为毫秒时间戳，everyMs=0为一次，否则至少一分钟；expiresAt须明确且在一年内。",
			effect: "write",
			inputSchema: object({
				...schedule,
				plotIndex: {
					type: "integer",
					minimum: 1,
					maximum: 2147483647
				}
			}, ["plotIndex"]),
			outputSchema: object({
				authorization: text,
				title: text,
				actor: actorSchema,
				inputId: text,
				...schedule
			}),
			authorize: (_input, context) => {
				authorizedEvent(context);
				return true;
			},
			handler: async (input, context) => {
				const event = authorizedEvent(context);
				const message = event.MessageText ?? "";
				const now = Date.now();
				if (!/(?:定时|预约|每隔|每天|每晚|明天|今晚|后|点)/u.test(message) || !/(?:收割|采收|领取.{0,6}灵药|收.{0,4}灵药)/u.test(message) || /(?:不要|不用|别|取消|停止).{0,8}(?:定时|预约|收割|采收|领取)|如果|假如|他说|她说|示例|代码|如何|怎么|能否|能不能|可以吗|是否|道侣|他人|别人|偷药/u.test(message)) fail("需要本人明确提出灵田采收预约");
				if (!event.MessageId || !event.BotId || !event.IsPrivate && !event.ChannelId) fail("预约缺少原消息或身份范围");
				let requestedPlot;
				try {
					requestedPlot = requestedHarvestPlot(message);
				} catch {
					fail("请明确采收全部本人灵田，或一个具体地块编号。");
				}
				if ((input.plotIndex ?? 0) !== requestedPlot) fail("预约地块与玩家原话不一致，未签发授权。");
				if (input.dueAt <= now || input.dueAt >= input.expiresAt || input.expiresAt > now + 31536e6 || input.everyMs < 0 || input.everyMs !== 0 && (input.everyMs < 6e4 || input.everyMs > 31536e6)) fail("预约时间或授权有效期无效");
				if (/每隔|每天|每晚|每.{0,6}(?:分钟|小时|天|周)|循环|定期/u.test(message) !== input.everyMs > 0) fail("预约的重复范围与玩家原话不一致");
				const { uid } = await currentPlayer(context);
				const config = getBackendConfig();
				const actor = {
					platform: event.Platform,
					botId: event.BotId,
					userId: event.UserId,
					channelId: event.IsPrivate ? "" : event.ChannelId,
					private: Boolean(event.IsPrivate)
				};
				const ticket = {
					version: 1,
					caller: context.callerApp,
					...actor,
					playerId: uid,
					inputId: event.MessageId,
					backend: config.scope,
					...input,
					plotIndex: input.plotIndex ?? 0
				};
				return {
					authorization: signHarvestTicket(ticket, config.robotAuthToken),
					title: input.plotIndex ? `采收灵田 ${input.plotIndex}` : "采收本人灵田",
					actor,
					inputId: event.MessageId,
					dueAt: input.dueAt,
					everyMs: input.everyMs,
					expiresAt: input.expiresAt
				};
			}
		}),
		execute: Expose.action({
			description: "仅供无玩家事件的宿主后台执行原签名预约；按原到期轮次幂等采收本人灵田。实时身份发生变化、过期或篡改时拒绝。",
			effect: "write",
			inputSchema: object({
				authorization: {
					type: "string",
					maxLength: 4096
				},
				operationId: {
					type: "string",
					minLength: 1,
					maxLength: 64
				},
				dueAt: integer
			}),
			outputSchema: object({
				outcome: {
					type: "string",
					enum: [
						"completed",
						"skipped",
						"rejected",
						"unknown"
					]
				},
				text,
				harvestedCount: integer
			}, ["harvestedCount"]),
			authorize: (_input, context) => {
				authorizedCaller(context);
				if (getCurrentEvent()) fail("预约只能由独立后台上下文执行");
				return true;
			},
			handler: async (input, context) => {
				const config = getBackendConfig();
				let ticket;
				try {
					ticket = readHarvestTicket(input.authorization, config.robotAuthToken);
				} catch {
					return {
						outcome: "rejected",
						text: "预约授权无效，请重新安排。"
					};
				}
				const now = Date.now();
				const offset = input.dueAt - ticket.dueAt;
				if (ticket.caller !== context.callerApp || ticket.backend !== config.scope || now >= ticket.expiresAt || input.dueAt > now || offset < 0 || (ticket.everyMs === 0 ? offset !== 0 : offset % ticket.everyMs !== 0) || input.dueAt >= ticket.expiresAt || !isGameEventEnabled({ name: ticket.private ? "private.message.create" : "message.create" })) return {
					outcome: "rejected",
					text: "预约已失效或当前范围不允许执行。"
				};
				try {
					assertChannelRobotEvent({
						Platform: ticket.platform,
						BotId: ticket.botId
					});
				} catch {
					return {
						outcome: "rejected",
						text: "机器人配置已变化，请重新安排。"
					};
				}
				const key = createHash("sha256").update(JSON.stringify([
					"scheduled-harvest-v1",
					input.authorization,
					input.dueAt
				])).digest("hex");
				const identity = await fetchBackendRobotIdentity(ticket.userId, {
					requestId: key,
					signal: context.signal
				});
				if (identity.account.status !== "registered" || identity.account.playerId !== ticket.playerId) return {
					outcome: "rejected",
					text: "角色绑定已变化，预约未执行。"
				};
				try {
					const result = await requestBackend(ticket.userId, "post_players_id_cave_plots_harvest", {
						path: { id: ticket.playerId },
						body: ticket.plotIndex ? { plotIndex: ticket.plotIndex } : {},
						requestId: key,
						idempotencyKey: key,
						signal: context.signal
					});
					if (typeof result?.message !== "string" || !Number.isSafeInteger(result.harvestedCount) || Number(result.harvestedCount) < 0) return {
						outcome: "unknown",
						text: "采收结果暂时无法核对，请先查看灵田，不要重复提交。"
					};
					return {
						outcome: Number(result.harvestedCount) > 0 ? "completed" : "skipped",
						text: result.message,
						harvestedCount: Number(result.harvestedCount)
					};
				} catch (error) {
					if (error instanceof BackendAPIError && error.status === 409 && error.message === "当前没有可收割的成熟灵植") return {
						outcome: "skipped",
						text: error.message,
						harvestedCount: 0
					};
					return {
						outcome: "unknown",
						text: "本次采收结果尚未确认，请先核对原结果。"
					};
				}
			}
		})
	}
};

//#endregion
export { scheduledHarvest };