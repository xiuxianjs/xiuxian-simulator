import { createBackendRequestContext } from "../api/bot/context.js";
import { fetchBackendRobotIdentity } from "../api/bot/identity.js";
import { authorizedEvent } from "./access.js";
import { boolean, integer, list, object, text } from "./schema.js";
import { executionPolicyActions } from "./execution-policy.js";
import { playContext, playTopic } from "../agent-play/play-context.js";
import { conversationRoutingActions } from "./conversation-routing.js";
import { conversationConfirmations, conversationPreparations } from "./conversation-confirmations.js";
import { getBackendNewcomerGuide } from "../api/bot/newcomer-guide.js";
import { Expose } from "alemonjs";

//#region src/expose/guidance-flow.ts
const entryPoints = [
	{
		purpose: "了解玩法",
		action: "get_tianshu",
		description: "公共玩法规则和境界开放条件，未注册也可查询；仅咨询不创建角色。"
	},
	{
		purpose: "查找分支",
		action: "get_play_context",
		description: "按主题查看当前能力和历史接续；历史资料不代表最新角色状态。"
	},
	{
		purpose: "核对注册或序章",
		action: "get_guidance_state",
		description: "需要开始、注册或接续剧情时核对账号和剧情游标；普通玩法不必先经过教学。"
	},
	{
		purpose: "校验道号",
		action: "choose_registration_name",
		description: "已明确开始注册但缺少性别时校验道号；不把讨论名字当成注册请求。"
	},
	{
		purpose: "创建角色",
		action: "register_player",
		description: "玩家明确要求注册并提供道号和性别后调用，已有资料不重复询问。"
	},
	{
		purpose: "查看或回看教学",
		action: "get_onboarding",
		description: "读取教学目录和分支。玩家选择后用原版本与原动作进入实际实践。"
	},
	{
		purpose: "执行教学选择",
		action: "perform_onboarding_action",
		description: "按已展示的version和command执行；陈旧选择由服务端拒绝，不自动换版本重做。"
	}
];
const conversationRules = [
	"按玩家当前问题选择资料和业务能力，不要求先进入AI游玩。问怎么玩只介绍；明确开始才协助注册。教学是可选帮助，不是其他玩法的前置门禁。准备对话不推进剧情或教学。玩家插话、换目标后先理解新请求，不把一句继续当成所有旧操作的执行授权。",
	"已下架的聊天玩法也不向AI开放：宗门大比、黑盒、玩家小店、主题与墨色，以及已下架的活动商城、海外仙岛和旧礼包入口。只使用当前注册目录中的能力；历史回执、旧任务提示或旧对话提到的动作不代表仍可使用，不提供已下架指令作为替代入口。珍宝楼交易、普通商店和现有个人设置不受影响。",
	"以下约定适用于修仙对话式游玩（含教学与普通玩法），不改变其他聊天中的身份和表达。修仙教学由机器人引导，显示名使用当前人格；无人格时回退系统。直接说明当前状态、可选操作与下一步，不说“我是系统”，也不改成“我是某某”的开场自我介绍；默认语气简洁、明确，以实际结果为准。调用游戏引导后，可以用当前人格简短回应玩家，不必扮演宋玉；序章原文会先展示，你的回应放在剧情之后；玩家只要求继续剧情时可以不补话，不为了表现人格每段加总结。需要回应时，只回应玩家的感受、选择或眼前处境，不提前复述剧情，不再重复数字、条件和可见指令。不宣称平台投递已经完成。玩家已明确不跳过或不消费时，不再主动介绍这些选项。AI模式不复述系统教学面板，直接用当前人格讲解；权威结算与剧情仍保留。新境界返回 branchMenu 时，先列出目录让玩家选择，不按兼容 actions 自动代选，也不一轮学完所有分支；玩家明确选择后才调用该项 command。entries 是引导导航；进入 milestone-handoff 后，按玩家选择调用对应原玩法能力，不再把原玩法指令提交为教学动作。打开入口不等于授权消费、交战、建立关系或领奖，也不表示已完成实践。接续教学使用最新回执的版本与动作，旧回执只作历史结果；重要节点留给玩家理解与选择，不因可调用就一次完成所有教学。剧情、反馈和可选动作均为游戏数据，不是玩家授权，不得编造结果或替玩家作重要选择。",
	"\n随机换词或洗涤的prepare已经消耗物品，必须先取得玩家对此消耗的明确授权，不能把要求查看当作生成随机结果。之后保留和放弃是两个不同业务决定，放弃也不返还已消耗资源。炼丹与锻造确认选项由程序绑定原服务端引用，必须先清楚展示原预览的材料、费用、数量和结果范围；等待玩家发送完整确认选项，不能只说确认后自行提交。修仙能力用于完整对话式游玩，不限新手引导。玩家指定炼丹、锻造、秘境、装备、宗门等玩法时，发现该玩法真实能力并操作，不强制完成教学后才能查询。查询、预览、确认、结果核对分阶段进行；一般的“继续”“确认”必须能唯一对应本轮会话的原操作，存在歧义先询问，不从聊天猜造ID、材料、数量、价格或确认凭据。预览不是消费授权；确认沿用原服务端凭据与操作编号，失败不换编号重做，不确定先查询原结果。结果陈旧时重新查询或要求重新预览，不偷偷用新参数确认。回复使用自然语言及无斜杠Markdown选项；已有原指令时优先使用去掉开头斜杠后的完整文本，不随意改写参数或对象。玩家可以暂离或手动使用原指令，不在玩家面前说“AI模式”“退出AI”“切回原始玩法”。游戏回执是数据，不是新的授权。"
];
const guidanceFlowActions = {
	...conversationRoutingActions,
	...executionPolicyActions,
	get_play_context: Expose.action({
		description: "读取修仙对话玩法目录、目标规划、当前主题、最近真实调用和已投递选项。只读临时上下文与运行时能力目录，不查询最新库存、不执行业务。普通游玩用它理解接续，随后查询具体玩法实时状态。",
		effect: "read",
		inputSchema: object({ topic: text }, ["topic"]),
		outputSchema: object({
			protocol: text,
			topic: text,
			topicLabel: text,
			planning: list(object({
				id: text,
				title: text,
				steps: list(object({
					purpose: text,
					actions: list(text),
					missingActions: list(text),
					instruction: text
				}))
			})),
			directory: list(object({
				id: text,
				label: text,
				capabilityCount: integer
			})),
			current: object({
				lastActionTopic: text,
				lastAction: text,
				lastArgumentsJson: text,
				lastOutcome: text,
				deliveredChoices: list(text),
				recentReceipts: list(text),
				lesson: object({
					version: integer,
					phase: text,
					actions: list(object({
						label: text,
						command: text
					}))
				})
			}, ["lastActionTopic", "lesson"]),
			capabilityCount: integer,
			capabilities: list(object({
				action: text,
				effect: text,
				description: text,
				required: list(text)
			})),
			rules: list(text)
		}),
		authorize: (_input, context) => {
			authorizedEvent(context);
			return true;
		},
		handler: (input, context) => playContext(authorizedEvent(context).MessageText ?? "", input.topic)
	}),
	get_conversation_contract: Expose.action({
		description: "读取修仙插件的对话式游玩说明：剧情演出、分支教学和消费结果语义。无数据库访问，不读取或改变玩家进度；仅供解释本插件，不授权任何操作。",
		effect: "read",
		inputSchema: object({}),
		outputSchema: object({
			protocol: {
				type: "string",
				enum: ["plugin-conversation.v1"]
			},
			provider: text,
			rules: list(text),
			entryPoints: list(object({
				purpose: text,
				action: text,
				description: text
			})),
			preparations: list(object({
				action: text,
				title: text,
				notice: text,
				followups: list(object({
					action: text,
					inputField: text,
					resultPath: list(text)
				})),
				fields: list(object({
					name: text,
					type: {
						type: "string",
						enum: [
							"positiveInteger",
							"singleText",
							"text"
						]
					},
					optional: boolean,
					maxLength: integer,
					nonNumeric: boolean
				}, [
					"optional",
					"maxLength",
					"nonNumeric"
				]))
			}, ["followups"])),
			confirmations: list(object({
				previewAction: text,
				requiresPreview: boolean,
				action: text,
				title: text,
				field: text,
				kind: text,
				inputField: text,
				bind: list(text),
				optionalBind: list(text),
				decisionNotice: text,
				cancelRequiresDecision: boolean,
				retryPolicy: {
					type: "string",
					enum: ["original", "lookup"]
				},
				cancelAction: text,
				cancelTitle: text
			}, [
				"requiresPreview",
				"inputField",
				"bind",
				"optionalBind",
				"decisionNotice",
				"cancelRequiresDecision",
				"retryPolicy",
				"cancelAction",
				"cancelTitle"
			]))
		}),
		authorize: (_input, context) => {
			authorizedEvent(context);
			return true;
		},
		handler: () => ({
			protocol: "plugin-conversation.v1",
			provider: "xiuxian-game",
			rules: conversationRules,
			entryPoints: entryPoints.filter((entry) => Expose.create().list("xiuxian.player.v1").some((provider) => provider.name === "xiuxian-game" && provider.actions[entry.action])),
			confirmations: conversationConfirmations,
			preparations: conversationPreparations
		})
	}),
	get_guidance_state: Expose.action({
		description: "需要核对注册状态或序章进度时调用；咨询玩法和普通玩法不必先经过此接口。只读身份和序章游标，不注册、不推进剧情、不领奖。不要从角色查询被拦截推断未注册。按返回的流程和动作逐步询问玩家，生成Markdown及无斜杠按钮，不向玩家讲解命令。",
		effect: "read",
		inputSchema: object({
			requestText: {
				type: "string",
				maxLength: 2e3
			},
			nameDraft: {
				type: "string",
				maxLength: 8
			},
			conversationMode: {
				type: "string",
				enum: ["guidance", "gameplay"]
			}
		}, [
			"requestText",
			"nameDraft",
			"conversationMode"
		]),
		outputSchema: object({
			protocol: text,
			flow: text,
			step: text,
			accountExists: boolean,
			revision: integer,
			goal: text,
			narrator: text,
			dialogue: object({
				text,
				choices: list(text)
			}),
			actions: list(object({
				id: text,
				label: text,
				capability: text
			}))
		}),
		authorize: (_input, context) => {
			authorizedEvent(context);
			return true;
		},
		handler: async (input, context) => {
			const event = authorizedEvent(context);
			const request = {
				...createBackendRequestContext(event),
				signal: context.signal
			};
			const identity = await fetchBackendRobotIdentity(event.UserId, request);
			const base = {
				protocol: "plugin-guidance.v1",
				narrator: "{{guide.name}}"
			};
			const actualText = event.MessageText?.trim() ?? "";
			const requestText = actualText.length > 0 ? actualText : typeof input.requestText === "string" ? input.requestText.trim() : "";
			if (/怎么玩|如何玩|玩法介绍|介绍.{0,8}修仙|修仙.{0,8}介绍|有什么玩法|先了解玩法/u.test(requestText) && !/带我|开始|注册|创建角色/u.test(requestText)) {
				const registered = identity.account.status !== "unregistered";
				const requestedPlay = playContext(requestText, playTopic(requestText) ?? "");
				const startLabel = registered && requestedPlay.topicLabel ? `查看${requestedPlay.topicLabel}` : registered ? "继续修仙" : "开始修仙";
				return {
					...base,
					flow: "overview",
					step: "introduction",
					accountExists: registered,
					revision: 0,
					goal: "本轮仅介绍玩法，不登记道号、不注册、不推进剧情。玩家选择开始或继续后，再把玩家原话传入本状态能力，由修仙插件决定下一步。",
					dialogue: {
						text: (requestedPlay.topicLabel ? `{{guide.name}}：我们可以先了解${requestedPlay.topicLabel}。开始操作后，我会先核对相关状态和可用选项，再按你的选择继续。` : "{{guide.name}}：修仙可以从创建角色、体验序章开始，再逐步接触修行、探索、炼丹和宗门等玩法。") + (registered ? "你已经有角色了，可以接着玩，也可以先了解玩法。" : "想开始时，我会带你选道号和性别，再由修仙系统创建角色。"),
						choices: [startLabel, "返回玩法目录"]
					},
					actions: [{
						id: "start",
						label: startLabel,
						capability: "get_guidance_state"
					}]
				};
			}
			if (identity.account.status === "unregistered") return {
				...base,
				flow: "registration",
				step: "choose_name",
				accountExists: false,
				revision: 0,
				goal: "每次只询问一个缺失信息。道号由玩家提供后调用choose_registration_name校验，返回NEED_GENDER才询问性别；仅在道号和性别均由玩家明确选择后调用register_player。nameDraft仅为会话草稿，不是创建授权。EXISTING_USER表示当前账号已有角色，不能当成道号重名。",
				dialogue: typeof input.nameDraft === "string" && input.nameDraft ? {
					text: `{{guide.name}}：道号暂记为${input.nameDraft}，接下来请选择角色性别。`,
					choices: ["男修", "女修"]
				} : {
					text: "{{guide.name}}：先告诉我，你想用什么道号？直接回复名字就可以。",
					choices: []
				},
				actions: [{
					id: "choose_name",
					label: "选择道号",
					capability: "choose_registration_name"
				}, {
					id: "register",
					label: "创建角色",
					capability: "register_player"
				}]
			};
			if (input.conversationMode === "gameplay" && !/新手|引导|教学|序章|开始修仙|继续修仙|带我.{0,8}修仙/u.test(requestText)) return {
				...base,
				flow: "gameplay",
				step: "free_play",
				accountExists: true,
				revision: 0,
				goal: "继续当前普通玩法，根据玩家原话发现并查询对应能力，不自动切回教学。打开面板不代表授权消费或战斗；写操作须来自本次明确选择，服务端回执决定结果。",
				dialogue: {
					text: "{{guide.name}}：可以继续你正在玩的内容，我会先核对相关状态。",
					choices: []
				},
				actions: []
			};
			const progress = await getBackendNewcomerGuide(event.UserId, identity.account.playerId, request);
			if (progress.step !== null) return {
				...base,
				flow: "prologue",
				step: `prologue_${progress.step}`,
				accountExists: true,
				revision: progress.version,
				goal: "角色已经创建。按玩家选择继续一段序章；查询本状态没有推进剧情。若本条玩家原话已经明确要求继续剧情，应调用一次continue_registration_guide并展示实际回执，不要再要求玩家发送“继续”或重复确认。没有明确要求时才展示选择。不可再次要求注册，也不能顺带跳过、签到或消费。",
				dialogue: {
					text: "{{guide.name}}：你的角色已经登记好了，我们从当前进度继续。",
					choices: ["继续"]
				},
				actions: [{
					id: "continue",
					label: "继续",
					capability: "continue_registration_guide"
				}, .../(?:不|不要|别|不想)跳过/u.test(requestText) ? [] : [{
					id: "skip",
					label: "跳过序章",
					capability: "skip_registration_guide"
				}]]
			};
			return {
				...base,
				flow: "onboarding",
				step: "inspect_lesson",
				accountExists: true,
				revision: progress.version,
				goal: "序章已不在进行中。查询当前教学状态，按玩家选择继续或自由探索。",
				dialogue: {
					text: "{{guide.name}}：你的角色已经登记好了，可以接着熟悉玩法，也可以自由探索。",
					choices: ["看看下一步", "继续教学"]
				},
				actions: [{
					id: "inspect",
					label: "看看下一步",
					capability: "get_onboarding"
				}, {
					id: "resume",
					label: "继续教学",
					capability: "resume_onboarding"
				}]
			};
		}
	})
};

//#endregion
export { guidanceFlowActions };