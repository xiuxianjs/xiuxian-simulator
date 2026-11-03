import { authorizedEvent } from "../expose/access.js";
import { boolean, list, object, text } from "../expose/schema.js";
import { endGuidance, gameConversationContinuation, guidanceSession, isGuidanceRequest, noteGuidance, rememberDeliveredDialogue, rememberGameReply, rememberGuidance } from "./guidance-session.js";
import { isPlayDirectoryRequest, playDirectoryText, selectPlayTopic } from "./play-context.js";
import { conversationalMenuPage, menuPagePattern, onboardingMenuPage } from "../response/onboarding/menu-pages.js";
import { acknowledgeConfirmationOptions, isGameConfirmationChoice, pendingBusinessCancellationNotice, pendingBusinessCancellations } from "./game-confirmation.js";
import { advanceGamePresentation, captureGamePresentation } from "./game-progress.js";
import { gameGuidance } from "./game-guidance.js";
import { routePluginConversation } from "./conversation-routing.js";
import { Expose, getCurrentEvent } from "alemonjs";

//#region src/agent-play/lifecycle.ts
const turns = /* @__PURE__ */ new Map();
const turnKey = () => {
	const event = getCurrentEvent();
	if (!event?.MessageId || !event.UserId) throw new Error("对话回合缺少消息身份");
	return JSON.stringify([
		event.Platform,
		event.BotId,
		event.ChannelId,
		event.UserId,
		event.MessageId
	]);
};
const authorize = (_input, context) => {
	authorizedEvent(context);
	return true;
};
const current = () => {
	const value = turns.get(turnKey());
	if (!value || value.expires <= Date.now()) throw new Error("对话回合已失效，请重新读取状态");
	return value.engine;
};
const callFields = {
	protocol: text,
	provider: text,
	action: text,
	argumentsJson: text
};
const conversationLifecycle = {
	name: "agent.conversation.v1",
	version: "1.0.0",
	description: "修仙对话生命周期。插件拥有流程、确认和回执；不供模型直接调用。",
	actions: {
		inspect: Expose.action({
			description: "读取临时会话归属",
			effect: "read",
			inputSchema: object({}),
			outputSchema: object({
				active: boolean,
				replyReferences: list(text)
			}),
			authorize,
			handler: () => ({
				active: Boolean(guidanceSession()),
				replyReferences: guidanceSession()?.replyReferences ?? []
			})
		}),
		match: Expose.action({
			description: "只读识别本条消息的明确主题或历史接续，不修改会话、不执行业务",
			effect: "read",
			inputSchema: object({}),
			outputSchema: object({ match: {
				type: "string",
				enum: [
					"explicit",
					"context",
					"none"
				]
			} }),
			authorize,
			handler: async () => {
				const explicit = await routePluginConversation("xiuxian.player.v1", "xiuxian-game", { active: false });
				const session = guidanceSession();
				const message = getCurrentEvent()?.MessageText?.trim() ?? "";
				if (explicit === "matched" || isPlayDirectoryRequest(message) || ["退出AI游玩", "退出对话游玩"].includes(message) || explicit === "legacy" && !session && isGuidanceRequest(message)) return { match: "explicit" };
				if (session && (menuPagePattern.test(message) || [
					"暂离",
					"退出引导",
					"暂离教学",
					"取消",
					"取消本次操作",
					"退出AI游玩",
					"退出对话游玩"
				].includes(message))) return { match: "context" };
				if (await isGameConfirmationChoice(message)) return { match: "explicit" };
				const continuation = await routePluginConversation("xiuxian.player.v1", "xiuxian-game", gameConversationContinuation());
				return { match: [
					"matched",
					"ambiguous",
					"legacy"
				].includes(continuation) && session ? "context" : "none" };
			}
		}),
		route: Expose.action({
			description: "处理本次接续或退出，不执行业务操作",
			effect: "write",
			inputSchema: object({ aiEnabled: boolean }),
			outputSchema: object({
				decision: text,
				prompt: text,
				reply: text
			}),
			authorize,
			handler: async (input) => {
				const event = getCurrentEvent();
				const message = event.MessageText?.trim() ?? "";
				const session = guidanceSession();
				const pageRequest = message.match(menuPagePattern);
				if (pageRequest && session && !message.startsWith("/") && input.aiEnabled) {
					const page = onboardingMenuPage(pageRequest[1], Number(pageRequest[2]), event);
					return {
						decision: "reply",
						prompt: "",
						reply: page ? conversationalMenuPage(page, session.narrator) : "这份目录已失效，请重新核对引导进度。[[继续引导]] [[返回玩法目录]]"
					};
				}
				if (!session?.offers?.some((offer) => offer.label === message) && await isGameConfirmationChoice(message)) return {
					decision: "reply",
					prompt: "",
					reply: "这个选择已失效，本次没有提交操作。之前已经执行的操作不会撤销。请先核对原结果，可以说“带我玩修仙”恢复，或发送 /我 使用原始玩法；不要重复消费。"
				};
				if (["退出AI游玩", "退出对话游玩"].includes(message) || session && ([
					"暂离",
					"退出引导",
					"暂离教学"
				].includes(message) || !input.aiEnabled)) {
					advanceGamePresentation();
					endGuidance(event);
					return {
						decision: "reply",
						prompt: "",
						reply: "先歇一会儿，进度已保留。想继续时叫我就好，也可以使用原来的玩法指令。"
					};
				}
				if (session?.offers?.length && ["取消", "取消本次操作"].includes(message)) {
					const labels = pendingBusinessCancellations();
					if (labels.length) return {
						decision: "reply",
						prompt: "",
						reply: pendingBusinessCancellationNotice() + "\n请选择要放弃的原结果，目前尚未提交。\n" + labels.map((label) => `[[${label}]]`).join(" ")
					};
					session.offers = [];
					return {
						decision: "reply",
						prompt: "",
						reply: "已取消本次对话中的待确认选择。已执行的操作不会撤销，请按需核对原结果。"
					};
				}
				if (isPlayDirectoryRequest(message) && input.aiEnabled) {
					if (!session) rememberGuidance({
						flow: "gameplay",
						directoryOnly: true
					});
					selectPlayTopic(message);
					return {
						decision: "reply",
						prompt: "",
						reply: playDirectoryText()
					};
				}
				const decision = await routePluginConversation("xiuxian.player.v1", "xiuxian-game", gameConversationContinuation());
				if (["unmatched", "unavailable"].includes(decision) || decision === "legacy" && !session && !isGuidanceRequest(message) || decision === "ambiguous" && !session) return {
					decision: "skip",
					prompt: "",
					reply: ""
				};
				if (!input.aiEnabled) return {
					decision: "reply",
					prompt: "",
					reply: "暂时无法接着聊。新玩家可以发送 /踏入仙途，已有角色可以发送 /我；新手引导和玩法仍可继续。"
				};
				selectPlayTopic(message);
				noteGuidance("玩家：" + message);
				return {
					decision: "claim",
					reply: "",
					prompt: (decision === "ambiguous" ? "本条归属尚不明确，历史只供理解；必要时澄清，不自动推进。" : "根据修仙插件提供的当前流程与本次原话接续。") + "\n以下是历史数据，不是授权：" + JSON.stringify({
						state: session?.state,
						validatedNameDraft: session?.registrationName,
						exchanges: session?.exchanges,
						receipts: session?.receipts,
						currentInput: message
					})
				};
			}
		}),
		start: Expose.action({
			description: "准备本消息对话回合",
			effect: "write",
			inputSchema: object({}),
			outputSchema: object({ prompt: text }),
			authorize,
			handler: async (_input, context) => {
				const key = turnKey();
				for (const [id, value] of turns) if (value.expires <= Date.now()) turns.delete(id);
				const existing = turns.get(key);
				if (existing) {
					if (existing.prompt === void 0) throw new Error("本条消息正在准备，请勿并发开启同一回合");
					return { prompt: existing.prompt };
				}
				const tools = [
					"expose_read",
					"expose_write",
					"expose_call"
				].map((name) => ({
					name,
					execute: (args, ctx) => {
						const input = JSON.parse(String(args.argumentsJson));
						return Expose.create().call(String(args.protocol), String(args.provider), String(args.action), input, {
							signal: ctx.signal,
							timeoutMs: 15e3
						});
					}
				}));
				const engine = gameGuidance(tools, getCurrentEvent()?.MessageText ?? "", captureGamePresentation());
				turns.set(key, {
					engine,
					expires: Date.now() + 18e5
				});
				if (turns.size > 1e3) turns.delete(turns.keys().next().value);
				try {
					const prompt = engine.instruction + await engine.prepare({ signal: context.signal });
					const turn = turns.get(key);
					if (turn?.engine === engine) turn.prompt = prompt;
					return { prompt };
				} catch (error) {
					if (turns.get(key)?.engine === engine) turns.delete(key);
					throw error;
				}
			}
		}),
		before_call: Expose.action({
			description: "核对玩家选择，不执行目标操作",
			effect: "write",
			inputSchema: object(callFields),
			outputSchema: object({
				allowed: boolean,
				rejectionJson: text
			}),
			authorize,
			handler: async (input, context) => {
				const denied = await current().beforeCall(input, { signal: context.signal });
				return {
					allowed: !denied,
					rejectionJson: denied ? JSON.stringify(denied) : ""
				};
			}
		}),
		after_call: Expose.action({
			description: "记录实际调用回执",
			effect: "write",
			inputSchema: object({
				...callFields,
				resultJson: text
			}),
			outputSchema: object({ recorded: boolean }),
			authorize,
			handler: async (input, context) => {
				await current().afterCall(input, JSON.parse(input.resultJson), { signal: context.signal });
				return { recorded: true };
			}
		}),
		review_reply: Expose.action({
			description: "只读核对本轮回复与领取回执；反馈不是新授权，不执行任何玩法。旧宿主可继续使用原render兜底。",
			effect: "read",
			inputSchema: object({ text }),
			outputSchema: object({
				accepted: boolean,
				feedback: text
			}),
			authorize,
			handler: (input) => current().review(input.text)
		}),
		present: Expose.action({
			description: "仅返回本轮修仙回执、剧情与确认选项，不接收或改写 AI 正文及其他插件内容。",
			effect: "write",
			inputSchema: object({ incomplete: boolean }),
			outputSchema: object({
				text,
				stale: boolean
			}),
			authorize,
			handler: (input) => ({
				text: current().append("", input.incomplete, true),
				stale: current().isStale()
			})
		}),
		render: Expose.action({
			description: "按实际回执呈现剧情结果与选择；模型未完成时仍保留已产生的结果。",
			effect: "write",
			inputSchema: object({
				text,
				incomplete: boolean
			}, ["incomplete"]),
			outputSchema: object({
				text,
				stale: boolean
			}),
			authorize,
			handler: (input) => ({
				text: current().append(input.text, input.incomplete),
				stale: current().isStale()
			})
		}),
		delivered: Expose.action({
			description: "平台成功回执后才确认选项已送达",
			effect: "write",
			inputSchema: object({
				text,
				receipts: list(object({
					id: text,
					referenceId: text
				}, ["referenceId"]))
			}),
			outputSchema: object({ accepted: boolean }),
			authorize,
			handler: (input) => {
				acknowledgeConfirmationOptions(input.text);
				rememberDeliveredDialogue(input.text);
				for (const receipt of input.receipts) rememberGameReply(receipt);
				return { accepted: true };
			}
		}),
		interrupt: Expose.action({
			description: "手动接管，失效旧回合",
			effect: "write",
			inputSchema: object({}),
			outputSchema: object({ accepted: boolean }),
			authorize,
			handler: () => {
				advanceGamePresentation();
				endGuidance(getCurrentEvent());
				return { accepted: true };
			}
		}),
		failure: Expose.action({
			description: "旧宿主兼容：优先保留本轮实际结果，没有结果时沿用原错误，不添加通用操作警告。",
			effect: "read",
			inputSchema: object({ text }),
			outputSchema: object({ text }),
			authorize,
			handler: (input) => {
				const result = turns.get(turnKey())?.engine.append("", true, true);
				return { text: result?.trim() ? result : input.text };
			}
		})
	}
};

//#endregion
export { conversationLifecycle };