import { isFreshObservation } from "../expose/execution-policy.js";
import { playGoal, playPlanning } from "./play-planning.js";
import { guidanceSession } from "./guidance-session.js";
import { Expose } from "alemonjs";

//#region src/agent-play/play-context.ts
const topics = [
	{
		id: "inventory",
		label: "背包与装备",
		words: /背包|材料|道具|装备|仓库|宝箱/u,
		actions: /inventory|bag|equipment|item|storage|lootbox|loadout/
	},
	{
		id: "alchemy",
		label: "炼丹",
		words: /炼丹|丹方|丹药|丹炉/u,
		actions: /alchemy|alchemist|peiyuan/
	},
	{
		id: "forge",
		label: "锻造",
		words: /锻造|打造|图纸|委托/u,
		actions: /forge|craft/
	},
	{
		id: "cultivation",
		label: "修行与境界",
		words: /修炼|修行|闭关|境界|突破|经脉|渡劫|心魔/u,
		actions: /meditation|realm|meridian|tribulation|heart_demon|cultivation/
	},
	{
		id: "exploration",
		label: "探索与战斗",
		words: /秘境|探索|历练|战斗|挑战|主线|通天/u,
		actions: /exploration|adventure|battle|storyline|tongtian|spirit_vein|pvp|pk_/
	},
	{
		id: "skills",
		label: "功法与神魂",
		words: /功法|技能|神魂|本命物|灵根|道途|宝物|悟道/u,
		actions: /skill|soul|spirit_root|treasure|wudao|mingwu/
	},
	{
		id: "guild",
		label: "宗门",
		words: /宗门|宗主|门派/u,
		actions: /guild/
	},
	{
		id: "social",
		label: "道侣与同道",
		words: /道侣|结偶|结缘|誓约|好友|师徒|拜师|收徒|组队/u,
		actions: /companion|friend|master|team/
	},
	{
		id: "cave",
		label: "洞府与灵田",
		words: /洞府|灵田|种植|灵药|采收/u,
		actions: /cave|herbal|profession/
	},
	{
		id: "market",
		label: "商店与交易",
		words: /商店|万宝楼|坊市|交易|购买|拍卖/u,
		actions: /shop|market|bounty|auction/
	},
	{
		id: "daily",
		label: "任务与日常",
		words: /签到|日常|任务|奖励|成就|活动|悬赏/u,
		actions: /task|reward|checkin|sign|achievement|activity|event|bounty/
	},
	{
		id: "profile",
		label: "资料与排行",
		words: /资料|属性|排行|天骄|称号|会员|天书/u,
		actions: /profile|attribute|leaderboard|ranking|tianjiao|title|membership|tianshu/
	},
	{
		id: "more",
		label: "其他玩法",
		words: /其他玩法|更多玩法/u,
		actions: /./
	}
];
function playTopic(text) {
	if (/新手|教学|引导|序章|注册|道号|修仙怎么玩|先了解玩法|写.{0,12}代码|翻译|播放音乐|买手机/u.test(text)) return;
	return playGoal(text)?.topic ?? topics.find((topic) => topic.words.test(text) && (topic.id !== "cultivation" || !/功法|装备|宝物|灵田|誓约|丹炉/u.test(text)))?.id;
}
const isPlayDirectoryRequest = (text) => /^(?:玩法目录|返回玩法目录|换个玩法|查看玩法目录)$/u.test(text.trim());
/** Navigation intent only; never alters the last operation or its confirmation. */
function selectPlayTopic(request) {
	const session = guidanceSession();
	const topic = playTopic(request);
	if (session && (topic || isPlayDirectoryRequest(request))) session.selectedPlayTopic = topic ?? "";
}
function playContext(request, requestedTopic) {
	const session = guidanceSession();
	const provider = Expose.create().list("xiuxian.player.v1").find((item) => item.name === "xiuxian-game");
	const actions = Object.entries(provider?.actions ?? {}).filter(([name]) => ![
		"get_play_context",
		"get_conversation_contract",
		"get_execution_policy",
		"route_conversation"
	].includes(name));
	const available = topics.map((topic) => ({
		topic,
		entries: actions.filter(([name]) => topic.id === "more" ? !topics.some((other) => other.id !== "more" && other.actions.test(name)) : topic.actions.test(name))
	})).filter((item) => item.entries.length);
	const topicId = requestedTopic ?? playTopic(request) ?? session?.selectedPlayTopic ?? session?.play?.topic;
	const selected = available.find((item) => item.topic.id === topicId);
	const rank = (entry) => entry[1].effect === "read" ? 0 : isFreshObservation(entry[0]) ? 1 : 2;
	const entries = [...selected?.entries ?? []].sort((left, right) => rank(left) - rank(right));
	return {
		protocol: "xiuxian.play-context.v1",
		topic: selected?.topic.id ?? "",
		topicLabel: selected?.topic.label ?? "",
		planning: playPlanning(request, new Set(actions.map(([name]) => name))),
		directory: available.map((item) => ({
			id: item.topic.id,
			label: item.topic.label,
			capabilityCount: item.entries.length
		})),
		current: {
			lastActionTopic: session?.play?.topic ?? "",
			lastAction: session?.play?.lastAction ?? "",
			lastArgumentsJson: session?.play?.argumentsJson ?? "",
			lastOutcome: session?.play?.outcome ?? "",
			deliveredChoices: session?.dialogueChoices ?? [],
			recentReceipts: session?.receipts ?? [],
			...session?.deliveredLesson ? { lesson: session.deliveredLesson } : {}
		},
		capabilityCount: entries.length,
		capabilities: entries.slice(0, 40).map(([action, meta]) => ({
			action,
			effect: meta.effect ?? "unknown",
			description: meta.description ?? "",
			required: meta.inputSchema?.type === "object" ? meta.inputSchema.required ?? [] : []
		})),
		rules: [
			"planning是本次目标的步骤建议，不是执行授权。actions只列当前已注册能力，missingActions不可调用。需要玩法规则时读取get_tianshu，需要角色条件时读取对应实时状态；没有预约执行回执不能承诺定时操作。",
			"目录说明插件已公开哪些能力，不代表当前角色已解锁。先查询对应玩法实时状态；按实际effect选择工具，名字带get或prepare也可能改变状态。",
			"current.lesson只记录已投递教学版本和动作，属于历史证据，不是实时状态或授权。玩家明确选择对应教学动作时沿用原version与command，服务端拒绝陈旧版本则重新查询，不自动替换版本后执行。",
			"先理解本次目标，再查状态和对象。缺少对象、数量或分支时每次问一个必要问题；名字重复或“第二个”不能唯一对应最近已展示对象时先澄清。",
			"已投递普通选项只用于理解上下文，不构成消费凭据。下一步必须使用真实查询结果中的对象和参数；重要写入仍走原预览与确认。",
			"current与recentReceipts是历史资料，不能据此声称当前库存、价格或操作已成功。结果不明时先核对原结果，不换编号重做。",
			"正常游玩用自然语言与无前缀选项，不要求进入或退出对话模式；返回玩法目录只导航。注册和序章按插件状态进行，不因打开玩法而自动跳过或推进。",
			"capabilities只是当前主题的有限索引；需要其他动作时按真实目录继续发现，不能臆造接口。按玩家授权范围完成操作并讲清实际结果；只有确实需要选择时提供选项，不要求每轮都有下一步。"
		]
	};
}
function playDirectoryText() {
	return "想先玩哪一项？这里是当前插件提供的玩法入口，是否开放以你的角色状态为准。\n" + playContext("").directory.map((item) => `[[${item.label}]]`).join("\n") + "\n[[继续新手引导]]";
}

//#endregion
export { isPlayDirectoryRequest, playContext, playDirectoryText, playTopic, selectPlayTopic };