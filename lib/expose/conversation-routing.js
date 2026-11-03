import { authorizedEvent } from "./access.js";
import { boolean, list, object, text } from "./schema.js";
import { isPlayDirectoryRequest, playTopic } from "../agent-play/play-context.js";
import { Expose } from "alemonjs";

//#region src/expose/conversation-routing.ts
const conversationRoutingActions = { route_conversation: Expose.action({
	description: "只判断当前原始消息是否属于修仙对话，不读取账号、不注册、不推进。历史会话仅供识别短回答，不构成执行授权；ambiguous表示须结合上下文或澄清。",
	effect: "read",
	inputSchema: object({
		active: boolean,
		flow: text,
		hasNameDraft: boolean,
		choices: list(text)
	}, [
		"flow",
		"hasNameDraft",
		"choices"
	]),
	outputSchema: object({
		protocol: {
			type: "string",
			enum: ["plugin-conversation-route.v1"]
		},
		decision: {
			type: "string",
			enum: [
				"matched",
				"unmatched",
				"ambiguous"
			]
		}
	}),
	authorize: (_input, context) => {
		authorizedEvent(context);
		return true;
	},
	handler: (input, context) => {
		const message = authorizedEvent(context).MessageText?.trim() ?? "";
		let decision = "unmatched";
		const explicitPlay = /背包|装备|道具|仓库|宝箱|丹方|丹药|丹炉|闭关|境界|突破|经脉|心魔|历练|主线|通天|技能|本命物|道途|宝物|悟道|道侣|结偶|结缘|誓约|师徒|拜师|收徒|灵田|灵药|万宝楼|坊市|签到|悬赏|我的资料|我的属性|天骄|天书|其他玩法|更多玩法/u.test(message);
		if (message && !/^[/#!！＃]/u.test(message) && !/写.{0,12}代码|翻译|播放音乐|买手机/u.test(message)) {
			if (playTopic(message) && (input.active || explicitPlay) || isPlayDirectoryRequest(message) || /修仙|道号|序章|新手引导|登记角色|注册角色|带我(?:继续|接着)?修行|炼丹|锻造|秘境|宗门|洞府|灵根|经脉|神魂|渡劫|功法|灵石/u.test(message)) decision = "matched";
			else if (input.active && input.flow === "registration" && input.hasNameDraft && /^(?:男修|女修|男|女)$/u.test(message)) decision = "matched";
			else if (input.active && input.choices?.includes(message)) decision = "matched";
			else if (input.active && !/天气|吃什么|晚饭|午饭|早饭|新闻|写.{0,12}代码|翻译|播放音乐/u.test(message) && [...message].length <= 12) decision = "ambiguous";
		}
		return {
			protocol: "plugin-conversation-route.v1",
			decision
		};
	}
}) };

//#endregion
export { conversationRoutingActions };