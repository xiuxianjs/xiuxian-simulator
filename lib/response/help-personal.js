import { buildBubble } from "./presentation/bubble.js";
import "./presentation/index.js";
import { parseBackendNavigation } from "../api/bot/navigation.js";
import { helpRealmName, helpRealmStage } from "./help-realm.js";

//#region src/response/help-personal.ts
const topics = {
	beginner: [
		"刚入门先做什么",
		"profile",
		"/初入仙途",
		"先看初入仙途的新人目标，再查当天签到奖励。进入炼气后，从能挑战的主线开始积累修为。"
	],
	realm: [
		"我离突破还有多远",
		"profile",
		"/我的境界",
		"查看修为、突破材料和下一个境界。"
	],
	story: [
		"主线接下来打哪关",
		"storyline",
		"/查看主线",
		"首通推进章节。已通关的关卡按星级、精力和次数判断能否扫荡。"
	],
	experience: [
		"现在去哪攒修为",
		"profile",
		"/任务面板 修炼",
		"比较当前可推进的主线和修炼入口。"
	],
	exploration: [
		"秘境探索怎么开始",
		"exploration",
		"/探索秘境",
		"先选秘境，再核对各时长的精力消耗和可得资源。已出发时，打开同一入口查看进度和返程条件。"
	],
	dungeon: [
		"今天还能打哪些秘境",
		"dungeons",
		"/秘境列表",
		"先核对境界、今日次数和精力；扫荡另有通关要求。"
	],
	resources: [
		"怎么获取资源",
		"checkin",
		"/任务面板",
		"先查今天可领的奖励。缺特定材料时，再按已开放的渠道找来源。"
	],
	rewards: [
		"今天有什么奖励能领",
		"checkin",
		"/任务面板",
		"从任务面板核对活跃、邮件及活动奖励。"
	],
	power: [
		"怎么提升战力",
		"equipment",
		"/我的装备",
		"先补空装备位。装备齐了就检查已装备的功法，再按当前开放的培养项补材料。"
	],
	equipment: [
		"怎么补装备",
		"equipment",
		"/我的装备",
		"先检查空装备位，再比较储物袋里满足穿戴条件的装备。"
	],
	skills: [
		"功法怎么提升",
		"skill-books",
		"/我的功法",
		"查看已学功法及可培养项，按当前搭配、材料和实际预览决定。"
	],
	meditation: [
		"闭关怎么攒修为",
		"profile",
		"/任务面板 修炼",
		"先查看当前闭关状态。闭关可积累修为与真气，出关时结算。"
	],
	forge: [
		"装备缺了怎么锻造",
		"forge",
		"/我的锻造",
		"从已解锁图纸选目标，按预览核对材料、职业条件与费用。"
	],
	root: [
		"灵根怎么提升",
		"spirit-root-cultivate",
		"/我的灵根",
		"培养和晋品分别检查材料和境界，先看当前缺口。"
	],
	master: [
		"师门今天还能做什么",
		"master",
		"/我的师门",
		"已有师徒关系后，再查看传功、赐福、赐丹及相应次数。"
	],
	team: [
		"我怎么找队伍",
		"teams",
		"/队伍列表",
		"根据当前要打的玩法找队伍，加入前核对队伍和副本要求。"
	],
	market: [
		"缺的材料哪里能买",
		"market",
		"/交易所",
		"先确认目标物品和缺少数量，再比较上架库存、价格和购买额度。"
	],
	template: [
		"怎么切换战斗配置",
		"battle-templates",
		"/战斗模板",
		"模板应用时会检查装备和功法能否使用。"
	],
	guild: [
		"宗门今天还能做什么",
		"guilds",
		"/我的宗门",
		"加入后可查看贡献、日常和周常。采矿、宗门主线与活动各有资格。"
	],
	tongtian: [
		"通天塔和声望怎么用",
		"tongtian-tower",
		"/查看通天塔",
		"在通天塔选择目标名次并核对元力消耗。获得声望后，到声望商店看可换的装备。"
	],
	companion: [
		"道侣今天还能做什么",
		"companion",
		"/我的道侣",
		"已有道侣关系后查看双修和任务资格，按任务及奖励选择。"
	],
	farm: [
		"灵田该收还是该种",
		"herbalist",
		"/我的灵田",
		"优先处理成熟作物和异常地块，再按所缺材料选择种子。"
	],
	alchemy: [
		"这炉丹还缺什么",
		"alchemy",
		"/炼丹 丹方",
		"选择目标丹方查看材料、工具与可炼数量，缺料时查对应来源。"
	],
	fishing: [
		"我现在能开塘吗",
		"fishing-build",
		"/垂钓 状态",
		"开塘需达到炼气九层并准备 10,000 灵石。已有水塘时可查看会话、渔获和钓技进度。"
	],
	meridian: [
		"今天还能冲几次脉",
		"meridians",
		"/经络",
		"按经络进度核对真气、冲脉次数和额外机会。"
	],
	tower: [
		"妖塔接下来打哪层",
		"demon-tower",
		"/妖塔",
		"查看当前层、扫荡资格和待领奖励，积分可在对应商店兑换。"
	],
	artifact: [
		"本命物怎么提升",
		"soul-artifact-equip",
		"/我的本命物",
		"先看是否已炼化。升级和升品还需金丹期及对应材料。"
	],
	tribulation: [
		"渡劫还差什么",
		"tribulation",
		"/我的渡劫",
		"查看实际劫云状态、准备材料和可用的结算步骤。"
	],
	soul: [
		"神魂和道途怎么提升",
		"soul-path",
		"/元婴神魂",
		"先查当前温养、补给和道途突破条件，再查看对应材料来源。"
	],
	boss: [
		"今天还能挑战凶兽吗",
		"world-boss",
		"/凶兽",
		"按活动时间、所在大境界及剩余次数查看挑战资格。"
	],
	treasure: [
		"宝录怎么继续收录",
		"tianshi-baolu",
		"/天师宝录",
		"查看已收录进度、下一项条件以及当前持有物。"
	],
	island: [
		"仙岛现在开放吗",
		"island",
		"/活动大厅",
		"仙岛按活动时间开放，先查看当前活动和参与资格。"
	],
	ladder: [
		"我能挑战登天梯吗",
		"tianjiao",
		"/登天梯",
		"达到当前大境界最高层后，再核对挑战次数和对手资格。"
	],
	spar: [
		"今天还能比试吗",
		"pvp",
		"/比试",
		"炼气一层开放。可用 UID 或 @道友指定已注册的其他玩家。"
	],
	bounty: [
		"悬赏怎么获得奖励",
		"bounty",
		"/悬赏榜",
		"查看可接受的悬赏和有效期，奖励取决于实际完成情况。"
	],
	relics: [
		"上古遗珍怎么获得",
		"items",
		"/上古遗珍",
		"查看免费探索、兑换和已持有遗珍，按实际效果与消耗决定。"
	],
	robbery: [
		"打劫有什么收益",
		"robbery",
		"/可打劫道友",
		"实际收益随目标、胜负和结算变化，先查看目标资格和元力消耗。"
	]
};
const aliases = {
	beginner: /刚入门|刚注册|刚开始|新人怎么|新手先/,
	realm: /突破|晋级|升境界|还差多少修为/,
	story: /主线宝箱|主线|哪关|章节|宝箱/,
	experience: /攒修为|赚修为|修为来源/,
	exploration: /探索秘境|秘境探索|返程/,
	dungeon: /秘境|副本/,
	resources: /获取资源|赚资源|资源怎么拿|资源从哪来|资源不够/,
	rewards: /签到奖励|活跃奖励|签到|邮件|活跃|领奖|奖励.*领|什么.*能领/,
	power: /提升战力|战力怎么提|提高战力|增加战力|战力太低|战力不够/,
	equipment: /装备|配装/,
	skills: /功法/,
	meditation: /闭关|打坐|出关/,
	forge: /锻造|打造/,
	root: /灵根/,
	master: /师门|拜师|出师|传功/,
	team: /秘境.{0,8}(?:组队|找队|进队)|(?:组队|找队|进队).{0,8}秘境|组队|队伍/,
	market: /在哪里买|在哪里卖|哪里买|哪里卖|去哪买|去哪卖|怎么买|怎么卖|交易所|买|卖|交易|小店/,
	template: /战斗配置|模板/,
	guild: /宗门|贡献|采矿/,
	tongtian: /通天塔|声望/,
	companion: /道侣|双修/,
	farm: /灵田|收割|播种|种什么/,
	alchemy: /炼丹|炉丹|丹方/,
	fishing: /垂钓|水塘|开塘|渔获/,
	meridian: /经络|冲脉/,
	tower: /妖塔/,
	artifact: /本命物/,
	tribulation: /渡劫|劫云/,
	soul: /神魂|道途(?:突破)?|温养/,
	boss: /凶兽/,
	treasure: /宝录/,
	island: /仙岛|海岛/,
	ladder: /登天梯|天骄/,
	spar: /比试|切磋/,
	bounty: /悬赏/,
	relics: /遗珍/,
	robbery: /打劫/
};
const keys = Object.keys(topics);
function helpTopic(question) {
	if (!question) return "overview";
	if ([...question].length > 80) return "unknown";
	const exact = keys.find((key) => topics[key][0] === question);
	if (exact) return exact;
	return keys.map((key) => ({
		key,
		length: aliases[key]?.exec(question)?.[0].length ?? 0
	})).filter((match) => match.length > 0).sort((a, b) => b.length - a.length)[0]?.key ?? "unknown";
}
function parsePersonalHelp(value) {
	const access = parseBackendNavigation(value);
	const progress = value.progress;
	if (progress && (typeof progress.realm !== "string" || !Array.isArray(progress.features) || !progress.features.every((feature) => typeof feature === "string"))) throw new Error("帮助响应不完整");
	return {
		...access,
		progress
	};
}
const questionButton = (topic) => ({
	label: topics[topic][0],
	command: "/帮助 " + topics[topic][0]
});
const amount = (value) => value.toLocaleString("zh-CN");
function growthAction(growth) {
	return growth?.kind === "渡劫" ? {
		label: "查看渡劫准备",
		command: "/我的渡劫"
	} : {
		label: "查看境界",
		command: "/我的境界"
	};
}
function helpNextStep(progress) {
	const { growth, story, farm, signed, meditation } = progress;
	const missing = growth ? Math.max(0, growth.required - growth.experience) : 0;
	const material = growth?.materials?.find((item) => item.currentQuantity < item.requiredQuantity);
	const realmAction = growthAction(growth);
	const storyAction = {
		label: "查看主线",
		command: story ? "/查看主线 " + story.chapter : "/查看主线"
	};
	if (growth?.ready) return {
		text: `已满足${growth.kind}条件，先${realmAction.label}。`,
		action: realmAction
	};
	if (meditation?.active && (meditation.experience > 0 || meditation.trueQi > 0)) return {
		text: "本次闭关已有预计收益。可打开闭关查看进度，再决定是否出关。",
		action: {
			label: "查看闭关进度",
			command: "/闭关"
		}
	};
	return growth?.target && missing === 0 && material ? {
		text: `${growth.kind}还缺${material.itemName} ${amount(material.requiredQuantity - material.currentQuantity)} 个。`,
		action: questionButton("realm")
	} : story?.chests ? {
		text: `主线有 ${story.chests} 个宝箱可领，先查看主线奖励。`,
		action: {
			label: "查看主线奖励",
			command: "/查看主线"
		}
	} : story?.ready ? {
		text: `可以继续挑战主线 ${story.chapter}-${story.nextStage}，推进关卡并积累修为。`,
		action: storyAction
	} : farm && (farm.mature > 0 || farm.abnormal > 0) ? {
		text: farm.mature > 0 ? `有 ${farm.mature} 块灵田已成熟，可以先收获。` : `有 ${farm.abnormal} 块灵田异常，可以先处理。`,
		action: {
			label: "查看灵田",
			command: "/我的灵田"
		}
	} : signed === false ? {
		text: "今天还未完成日常签到，可以先查看签到奖励。",
		action: {
			label: "签到概览",
			command: "/签到概览"
		}
	} : missing > 0 && meditation?.active ? {
		text: "当前正在闭关，可以查看剩余时间。",
		action: {
			label: "查看闭关进度",
			command: "/闭关"
		}
	} : missing > 0 && meditation?.canStart ? {
		text: "当前可以闭关攒修为，先查看闭关条件。",
		action: {
			label: "查看闭关",
			command: "/闭关"
		}
	} : {
		text: "查看已开放的玩法和待领取资源，按当前缺口选择。",
		action: {
			label: "任务面板",
			command: "/任务面板"
		}
	};
}
function personalHelpBubble(context, topic, progress) {
	const back = {
		label: "返回帮助",
		command: "/帮助"
	};
	const tianshu = {
		label: "下境解锁",
		command: "/天书"
	};
	if (!progress) return buildBubble({
		...context,
		title: "修仙帮助",
		sections: [{ lines: ["状态：个人进度暂时无法读取。"] }],
		footer: [topic === "overview" ? {
			label: "重试",
			command: "/帮助"
		} : back]
	});
	const { growth, story, signed, farm, tower, meditation } = progress;
	const has = (key) => progress.features.includes(topics[key][1]);
	const missing = growth ? Math.max(0, growth.required - growth.experience) : 0;
	const storyAction = {
		label: "查看主线",
		command: story ? "/查看主线 " + story.chapter : "/查看主线"
	};
	const growthLine = growth ? `修为：${amount(growth.experience)} / ${amount(growth.required)}${missing ? " · 还差 " + amount(missing) : ""}` : "修为：暂时无法读取";
	const storyLine = story ? `主线：第 ${story.chapter} 章 · 已通关 ${story.cleared}/${story.total}` : "";
	const prioritized = [
		...growth?.ready ? ["realm"] : [],
		...story?.ready ? ["story"] : [],
		...story?.nextStage && !story.ready ? ["story"] : [],
		...farm && (farm.mature > 0 || farm.abnormal > 0) ? ["farm"] : [],
		...signed === false || story?.chests ? ["rewards"] : [],
		...tower?.started && !tower.finished ? ["tower"] : [],
		...meditation?.active ? ["meditation"] : [],
		"realm",
		...[
			"soul",
			"artifact",
			"meridian",
			"alchemy",
			"farm",
			"companion",
			"guild",
			"market",
			"master",
			"story",
			"power",
			"dungeon",
			"experience"
		]
	];
	const towerLine = tower ? `妖塔：${tower.finished ? "今日已完成" : tower.started ? "第 " + tower.layer + " 层" : "今日未开始"}` : "";
	const meditationLine = progress.meditation?.active ? `闭关：已进行 ${progress.meditation.minutes} 分钟 · 修为 ${amount(progress.meditation.experience)} · 真气 ${amount(progress.meditation.trueQi)}` : "";
	if (topic === "overview" || topic === "unknown") {
		const next = helpNextStep(progress);
		const questions = [...new Set(prioritized)].filter(has).map(questionButton).filter((question) => question.command !== next.action.command).slice(0, 3);
		const realm = helpRealmName(progress.realm);
		const liveProgress = [
			meditationLine,
			storyLine,
			farm?.mature ? `灵田：${farm.mature} 块已成熟` : farm?.abnormal ? `灵田：${farm.abnormal} 块异常` : "",
			signed === false ? "签到：今日未签" : "",
			tower?.started && !tower.finished ? towerLine : ""
		].filter(Boolean).slice(0, 3);
		return buildBubble({
			...context,
			title: "修仙帮助 · " + progress.realm,
			sections: [{ lines: [growthLine, ...liveProgress] }, {
				title: "下一步",
				lines: [...topic === "unknown" ? ["说明：请选择页脚的问题查看具体进度。"] : [], "说明：" + next.text],
				actions: [next.action]
			}],
			footer: [questions, [
				...realm ? [{
					label: "本境界怎么玩",
					command: "/帮助 " + realm
				}] : [],
				tianshu,
				{
					label: "更多玩法",
					command: "/更多"
				}
			]]
		});
	}
	const [title, , command, description] = topics[topic];
	const lines = ["说明：" + description];
	if (!has(topic)) {
		const required = progress.lockedRealms?.[topics[topic][1]];
		const realm = typeof required === "string" ? helpRealmName(required) : void 0;
		const unlockPage = realm && (/^炼气.+层$/u.test(realm) ? realm : helpRealmStage(realm));
		return buildBubble({
			...context,
			title,
			sections: [{ lines: [realm ? "条件：达到" + realm + "后开放。" : "状态：当前境界下此玩法不可用。"] }],
			footer: [
				back,
				unlockPage ? {
					label: "查看解锁",
					command: "/天书 " + unlockPage
				} : tianshu,
				{
					label: "境界目录",
					command: "/天书 目录"
				}
			]
		});
	}
	let action = {
		label: "查看详情",
		command
	};
	const extraActions = [];
	if (topic === "exploration") {
		action = {
			label: "查看探索秘境",
			command
		};
		const exploration = progress.exploration;
		if (exploration?.active) {
			lines.splice(0, 1, exploration.completed ? "状态：探索已完成，可打开探索面板返程。" : `状态：探索中 · 剩余约 ${exploration.remaining} 小时 · 可结算 ${exploration.settleable} 小时`);
			action = {
				label: "查看探索进度",
				command
			};
		} else if (exploration?.startReason) lines.unshift("状态：" + exploration.startReason);
	}
	if (topic === "resources") {
		action = questionButton("rewards");
		if (has("dungeon")) extraActions.push(questionButton("dungeon"));
		if (has("farm")) extraActions.push(questionButton("farm"));
	}
	if (topic === "power") {
		action = {
			label: "检查装备",
			command
		};
		if (has("skills")) extraActions.push({
			label: "检查功法",
			command: "/我的功法"
		});
		const cultivation = [
			"soul",
			"artifact",
			"meridian",
			"root"
		].find(has);
		if (cultivation) extraActions.push(questionButton(cultivation));
	}
	if (topic === "fishing" && progress.fishingBuild) {
		const { level, missingStone } = progress.fishingBuild;
		if (level > 0) {
			lines.splice(0, 1, `状态：已开辟 ${level} 阶水塘，可以查看当前会话和渔获。`);
			action = {
				label: "查看垂钓状态",
				command
			};
		} else if (missingStone > 0) lines.push(`灵石：开塘还差 ${amount(missingStone)}`);
		else {
			lines.push("状态：灵石已够，可预览开塘。");
			action = {
				label: "预览开塘",
				command: "/垂钓 建塘"
			};
		}
	}
	if (topic === "spar") {
		const spar = progress.spar;
		action = {
			label: "找比试对象",
			command
		};
		if (spar) {
			lines.unshift(`数量：元力 ${amount(spar.qi)} · 发起需 ${amount(spar.requiredQi)}`, spar.remaining === void 0 ? "状态：暂时无法读取今日次数。" : `次数：今日剩 ${spar.remaining}/${spar.dailyLimit} 次`);
			if (spar.remaining === 0 || spar.qi < spar.requiredQi) {
				lines.push(spar.remaining === 0 ? "状态：今日比试次数已用完。" : `状态：元力还差 ${amount(spar.requiredQi - spar.qi)} 点。`);
				action = {
					label: "查看我的面板",
					command: "/我的面板"
				};
			}
		}
	}
	if (topic === "team") {
		if (progress.inTeam === true) {
			lines.splice(0, 1, "状态：已在队伍中。先查看队员和队伍要求，再和队友确认要打的玩法。");
			action = {
				label: "查看我的队伍",
				command: "/我的队伍"
			};
		} else action = {
			label: "查看队伍列表",
			command
		};
	}
	if (topic === "guild") {
		if (progress.guildNeedsJoin === true) {
			lines.splice(0, 1, "说明：先打开宗门列表申请加入。入宗后再查看宗门日常和贡献。");
			action = {
				label: "查看宗门列表",
				command: "/宗门列表"
			};
		} else {
			action = {
				label: "查看我的宗门",
				command
			};
			if (progress.guildNeedsJoin === false && progress.features.includes("guild-mining")) extraActions.push({
				label: "查看挖矿状态",
				command: "/宗门日常"
			});
			if (progress.guildNeedsJoin === false && progress.features.includes("guild-storyline")) extraActions.push({
				label: "查看宗门主线",
				command: "/宗门主线"
			});
		}
	}
	if (topic === "alchemy") {
		if (progress.alchemyUnlocked === false) {
			lines.splice(0, 1, "说明：先完成炼丹师引导，就能查看已掌握的丹方。");
			action = {
				label: "炼丹入门",
				command: "/炼丹 入门"
			};
		} else action = {
			label: "查看丹方",
			command
		};
	}
	if (topic === "market") {
		const missingMaterials = (growth?.materials ?? []).filter((item) => item.currentQuantity < item.requiredQuantity);
		lines.push(...missingMaterials.map((item) => `材料：${item.itemName}还差 ${amount(item.requiredQuantity - item.currentQuantity)}`));
		const searchable = missingMaterials.find((item) => /^[\p{L}\p{N}·]{1,32}$/u.test(item.itemName));
		action = searchable ? {
			label: "搜索" + searchable.itemName,
			command: "/珍宝楼 搜索 " + searchable.itemName
		} : {
			label: "搜索材料",
			command: "/珍宝楼 搜索"
		};
		if (missingMaterials.length) lines.push("说明：先看是否有挂单，再对比单价和可买数量。");
	}
	if (topic === "tongtian") {
		action = {
			label: "查看通天塔",
			command
		};
		extraActions.push({
			label: "声望商店",
			command: "/商店 声望"
		});
	}
	if (topic === "meridian") {
		action = {
			label: "查看经络",
			command
		};
		if (progress.missingPulseQi && has("meditation")) {
			lines.splice(0, 1, `真气：还差 ${amount(progress.missingPulseQi)} 点。闭关出关可结算真气。`);
			extraActions.push(questionButton("meditation"));
		}
	}
	if (topic === "realm" || topic === "tribulation" && growth?.kind === "渡劫") {
		const materials = (growth?.materials ?? []).filter((item) => item.currentQuantity < item.requiredQuantity);
		action = growthAction(growth);
		if (growth?.target && !growth.ready && missing > 0 && growth.kind !== "渡劫") extraActions.push(questionButton("experience"));
		if (materials.length && has("market")) extraActions.push(questionButton("market"));
		lines.splice(0, 1, growthLine, ...[
			growth?.target ? `目标：${growth.target}` : growth ? "状态：暂无下一境界资料" : "",
			growth?.ready ? `状态：已满足${growth.kind}条件` : growth?.reason ? "状态：" + growth.reason : "",
			...materials.map((item) => `材料：${item.itemName}还差 ${amount(item.requiredQuantity - item.currentQuantity)}`),
			growth?.target && materials.length && missing > 0 ? "说明：修为和材料都要补齐。" : ""
		].filter(Boolean));
	}
	if (topic === "story" || topic === "experience") {
		if (story) {
			lines.push(storyLine);
			if (story.nextStage) lines.push(`状态：${story.chapter}-${story.nextStage} · ${story.ready ? "可查看并挑战" : story.blocker ?? "请查看挑战条件"}`);
			if (topic === "story" && story.allVisibleCleared) {
				lines.push("状态：当前已开放的主线关卡均已通关。");
				extraActions.push(questionButton("experience"));
			}
			if (story.chests) {
				lines.push(`待领取：主线宝箱 ${story.chests} 个`);
				if (topic === "story") extraActions.push({
					label: "查看宝箱领取入口",
					command: "/查看主线"
				});
			}
			action = storyAction;
		} else if (topic === "story") lines.push("状态：暂无可展示的章节进度。");
		if (topic === "story" && story?.nextStage && !story.ready) {
			if (story.blockerCode === "mental" || story.blockerCode === "daily-limit") {
				lines.push("说明：可先改用闭关等方式攒修为，等精力或次数恢复再推主线。");
				extraActions.push(questionButton("experience"));
			} else if (story.blockerCode === "team" && has("team")) extraActions.push({
				label: "查看我的队伍",
				command: "/我的队伍"
			});
		}
		if (topic === "experience") {
			lines.unshift(growthLine);
			if (growth?.ready) {
				action = growthAction(growth);
				lines.push("说明：已满足" + growth.kind + "条件，先" + action.label + "。");
			} else if (story?.ready && story.nextStage > 0) lines.push(`说明：先推主线 ${story.chapter}-${story.nextStage}，通关可获得修为。`);
			else if (progress.meditation?.active) {
				action = {
					label: "查看闭关进度",
					command: "/闭关"
				};
				lines.push("说明：当前正在闭关，可查看本次修为和真气。");
			} else if (meditation?.canStart) {
				action = {
					label: "开始闭关",
					command: "/闭关"
				};
				lines.push("说明：可开始闭关，出关后结算修为。");
			} else {
				action = {
					label: "修炼面板",
					command
				};
				if (meditation?.startReason === "daily_qi_limit") lines.push("状态：今日真气已达上限，明日可再闭关。");
			}
		}
	}
	if (topic === "dungeon") {
		const { mental } = progress;
		const entries = progress.dungeons ?? [];
		if (mental !== void 0) lines.push(`数量：当前精力 ${mental}`);
		if (!entries.length) {
			const empty = progress.dungeonTotal === 0;
			return buildBubble({
				...context,
				title,
				sections: [{
					lines: [empty ? "状态：当前境界范围内暂无可挑战的秘境。" : "状态：暂时无法读取秘境进度。"],
					actions: [{
						label: "查看秘境列表",
						command
					}]
				}],
				footer: [back, ...empty && has("resources") ? [questionButton("resources")] : []]
			});
		}
		const remaining = entries.filter((entry) => entry.limit <= 0 || entry.used < entry.limit);
		const available = remaining.filter((entry) => entry.free > 0 || mental !== void 0 && mental >= entry.cost);
		const exhausted = entries.length > 0 && progress.dungeonTotal === entries.length && remaining.length === 0;
		const candidate = progress.inTeam === true ? void 0 : available.find((entry) => entry.single === true && entry.contributionCost === 0 && /^[\p{L}\p{N}·]{1,32}$/u.test(entry.name));
		const visible = [.../* @__PURE__ */ new Set([
			...candidate ? [candidate] : [],
			...available,
			...entries
		])].slice(0, 4);
		for (const entry of visible) {
			const left = entry.limit > 0 ? Math.max(0, entry.limit - entry.used) : void 0;
			const quota = left === void 0 ? "今日不限次" : `今日剩 ${left} 次`;
			const cost = left === 0 ? "" : entry.free > 0 ? ` · 免精力 ${entry.free} 次` : ` · 耗 ${entry.cost} 精力`;
			const group = entry.single === false ? ` · 至少 ${entry.minPlayers ?? 1} 人` : "";
			const contribution = entry.contributionCost ? ` · 需 ${entry.contributionCost} 贡献` : "";
			const shortage = left !== 0 && entry.free === 0 && mental !== void 0 && mental < entry.cost ? ` · 精力还差 ${entry.cost - mental}` : "";
			lines.push(`进度：${entry.name} · ${quota}${cost}${shortage}${group}${contribution}`);
		}
		if (progress.dungeonTotal !== void 0 && progress.dungeonTotal > visible.length) lines.push(`说明：当前显示 ${visible.length}/${progress.dungeonTotal} 个秘境，更多请查看秘境列表。`);
		action = candidate ? {
			label: "查看" + candidate.name,
			command: "/秘境详情 " + candidate.name
		} : {
			label: "查看秘境列表",
			command
		};
		if (exhausted) {
			lines.unshift("状态：符合境界的秘境今日挑战次数均已用完。");
			if (progress.inTeam === true && entries.some((entry) => entry.single === false)) {
				lines.push("说明：队伍满足挑战条件，且至少一名队友能获得收益时，你仍可参战，本次本人无秘境结算奖励。");
				extraActions.push({
					label: "查看我的队伍",
					command: "/我的队伍"
				});
			}
			if (has("resources")) extraActions.push(questionButton("resources"));
		} else if (candidate) extraActions.push({
			label: "全部秘境",
			command
		});
		else if (progress.inTeam === true) {
			lines.push("说明：当前已入队，先核对队伍人数和队友条件。");
			extraActions.push({
				label: "查看我的队伍",
				command: "/我的队伍"
			});
		} else if (has("team") && available.some((entry) => entry.single === false && entry.contributionCost === 0)) {
			lines.push("说明：可先查看队伍和秘境的人数要求，再决定是否组队挑战。");
			extraActions.push(questionButton("team"));
		}
	}
	if (topic === "tower") {
		action = {
			label: "打开妖塔",
			command
		};
		if (tower) {
			const next = tower.finished ? "今日已结束，可以到积分商店查看能换的物品。" : tower.sweepable && tower.sweepableLayers ? `今天可扫荡前 ${tower.sweepableLayers} 层。从妖塔面板扫荡后，再看下一关。` : tower.canChallenge && tower.targetLayer ? `打开妖塔比较第 ${tower.targetLayer} 层各星级的战力，再选择要打的星级。` : "打开妖塔核对当前关卡和可用操作。";
			lines.splice(0, 1, towerLine + (tower.started && !tower.finished && tower.stage ? ` · 第 ${tower.stage} 关` : ""), "说明：" + next);
			if (tower.score !== void 0) lines.push("积分：" + amount(tower.score));
			if (tower.finished) action = {
				label: "积分商店",
				command: "/商店 积分"
			};
		}
	}
	if (topic === "meditation" && progress.meditation?.active) action = {
		label: "查看闭关进度",
		command: "/闭关"
	};
	if ((topic === "meditation" || topic === "experience") && meditationLine) lines.unshift(meditationLine);
	if (topic === "rewards") {
		const sections = [];
		if (story?.chests) sections.push({
			lines: [`待领取：主线宝箱 ${story.chests} 个`],
			actions: [{
				label: "查看主线宝箱",
				command: "/查看主线"
			}]
		});
		for (const [period, label] of [["daily", "日常活跃"], ["weekly", "周常活跃"]]) {
			const count = progress.activityRewards?.[period];
			if (count) sections.push({
				lines: [`待领取：${label} ${count} 档`],
				actions: [{
					label: "查看" + label,
					command: "/" + label
				}]
			});
		}
		if (signed === false) sections.push({
			lines: ["状态：日常签到待完成"],
			actions: [{
				label: "查看签到",
				command: "/签到概览"
			}]
		});
		const checked = signed === true && (!has("story") || story?.chests === 0) && progress.activityRewards?.daily === 0 && progress.activityRewards?.weekly === 0;
		const hint = sections.length || !checked ? "说明：邮件和活动奖励可到任务面板核对。" : "状态：签到已完成，当前没有待领的主线宝箱和活跃奖励。邮件及活动可到任务面板核对。";
		return buildBubble({
			...context,
			title,
			sections: [...sections, { lines: [hint] }],
			footer: [back, {
				label: "任务面板",
				command
			}]
		});
	}
	if (topic === "farm") {
		action = {
			label: "查看灵田",
			command
		};
		if (progress.farmNeedsGuide) {
			lines.splice(0, 1, "状态：还没有灵田。先完成灵药师引导，之后就能查看地块并播种。");
			action = {
				label: "灵药师引导",
				command: "/加入灵药师"
			};
		} else if (farm) {
			const status = `进度：种植 ${farm.planted} 块 · 成熟 ${farm.mature} 块 · 异常 ${farm.abnormal} 块`;
			const next = farm.mature > 0 ? "说明：先到灵田收获成熟作物，再按缺少的材料安排播种。" : farm.abnormal > 0 ? "说明：先打开灵田处理异常地块。" : farm.empty ? `说明：还有 ${farm.empty} 块空地，可查看种子并选地块播种。` : farm.planted > 0 && farm.empty === 0 ? "说明：当前作物尚未成熟，到灵田查看剩余时间。" : "说明：打开灵田确认空地、种子和成熟时间。";
			lines.splice(0, 1, status, next);
			if (!farm.mature && !farm.abnormal && farm.empty) action = {
				label: "查看可播种子",
				command: "/播种"
			};
		}
	}
	const details = (progress.details ?? []).map((detail) => "进度：" + detail);
	if (topic === "tongtian" || topic === "meridian") lines.unshift(...details.length ? details : ["状态：当前进度暂未查到，可打开下方入口核对。"]);
	else lines.push(...details);
	const followUp = (topic === "realm" ? extraActions.some((item) => item.command === questionButton("experience").command) ? ["story"] : ["experience", "story"] : topic === "resources" ? [
		"market",
		"exploration",
		"realm"
	] : ["realm", "rewards"]).filter(has).map(questionButton);
	return buildBubble({
		...context,
		title,
		sections: [{
			lines,
			actions: [action, ...extraActions]
		}],
		footer: [
			back,
			...followUp,
			...topic === "realm" ? [tianshu] : []
		]
	});
}

//#endregion
export { helpNextStep, helpTopic, parsePersonalHelp, personalHelpBubble };