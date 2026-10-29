import { parseBackendNavigation } from "../api/bot/navigation.js";
import { FormatGui } from "../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../utils/useMessage.js";
import { selects } from "./config.js";
import { runRobotBusiness } from "./robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/help.ts
const NEWCOMER_STAGE_GUIDES = {
	1: {
		title: "萌新帮助 · 第一阶段",
		subtitle: "首日到第1天，先学会最短变强闭环",
		sections: [
			{
				title: "玩法地图",
				lines: [
					"主线：前期最重要的推进线，负责修为、宝箱和章节进度。",
					"境界：使用/突破，前期最大面板来源。关于突破说明详细可看/我的境界",
					"签到与初入仙途：负责把当天能拿的追赶资源先拿满。"
				]
			},
			{
				title: "本阶段目标",
				lines: ["先学会最短变强闭环：主线 -> 修为 -> 突破/晋级 -> 继续推主线。", "这一天先把主线、境界、签到三件事玩明白。"]
			},
			{
				title: "今日清单",
				lines: [
					"【1】 /签到：先拿今日资源",
					"【2】 /初入仙途：看当天新人目标与奖励",
					"【3】 /查看主线：按推荐章节推进",
					"【4】 /突破：修为满了就升",
					"【5】 下线前 /闭关：积累真气与少量修为，为后续经络和冲脉做准备"
				]
			},
			{
				title: "卡关处理",
				lines: [
					"主线打不过时，先看能不能 /突破，若修为不足可扫荡之前的关卡。",
					"冲击境界或主线受阻时，可尝试 /拜师，获得传功、赐福与赐丹帮助。",
					"若挑战类内容吃力，也可通过 /创建队伍 或 /队伍列表 组队过渡。"
				]
			},
			{
				title: "别踩坑",
				lines: ["闭关积累真气与修为，探索秘境获取战利品。", "如果今天只能做3件事，就做：签到、主线、突破。"]
			}
		],
		footer: [
			{
				label: "下阶段",
				command: "/修仙帮助 2"
			},
			{
				label: "签到",
				command: "/签到"
			},
			{
				label: "任务",
				command: "/初入仙途"
			},
			{
				label: "主线",
				command: "/查看主线"
			},
			{
				label: "秘境",
				command: "/查看秘境"
			},
			{
				label: "更多玩法",
				command: "/更多"
			}
		]
	},
	2: {
		title: "萌新帮助 · 第二阶段",
		subtitle: "炼气二层至九层，逐步接入新玩法",
		sections: [
			{
				title: "玩法地图",
				lines: [
					"秘境：第二条稳定推进线，除了材料外，还会掉落功法。",
					"功法：当前中前期最重要的战力来源之一，要比装备更值得优先关注。",
					"师门与组队：炼气二层后已开放，是冲境界、过挑战时的重要助力。"
				]
			},
			{
				title: "本阶段目标",
				lines: ["沿主线积累修为，按境界逐步接入适合当前阶段的玩法。", "开放节奏可随时查看 /天书；具体挑战还需满足关卡、组队等条件。"]
			},
			{
				title: "每日循环",
				lines: [
					"【1】 /签到 -> /初入仙途：先领当天资源",
					"【2】 /查看主线：继续推进核心战力线",
					"【3】 /突破 或 /晋级：修为满了就升",
					"【4】 /查看秘境：开始补第二条副本线",
					"【5】 /我的功法：检查是否有新功法可学、可升级",
					"【6】 下线前 /闭关：继续积累真气，并补一点离线修为"
				]
			},
			{
				title: "秘境与功法",
				lines: [
					"/查看秘境：开始接触第二条副本线，补材料和掉落。",
					"秘境掉落的功法非常重要，是当前最现实、最稳定的战力来源之一。",
					"/学习功法、/升级功法：这阶段要经常看，不能只盯着境界。"
				]
			},
			{
				title: "卡关处理",
				lines: [
					"先检查 /突破、/晋级 和 /我的功法 三件事。",
					"若仍然推进困难，可尝试 /拜师，借助师父的传功、赐福、赐丹补强。",
					"若是挑战类内容吃力，也可尝试组队推进，不必只靠单人硬打。"
				]
			},
			{
				title: "冲九层提示",
				lines: [
					"无境界限制：洞府与职业总览、成就、排行榜；炼气二层：好友、组队、师门与飞简。",
					"若想继续通过装备补强，这时就走这条线：通天塔 -> 声望 -> /商店 声望。",
					"炼气三层：战斗模板、交易；四层：加入宗门；五层：道侣与通天塔；七层：灵田、灵药师与阵法；九层：炼丹与创建宗门。",
					"境界达标只是开放条件，职业指引、宗门权限及材料消耗仍按实际规则执行。"
				]
			},
			{
				title: "五层后先做什么",
				lines: [
					"通天塔：五层后最实用，能稳定拿声望。",
					"声望商店：拿到声望后可直接补装备，是五层后的新装备线。",
					"成就和排行榜：注册后即可查看，成就奖励需真实完成目标。"
				]
			},
			{
				title: "别踩坑",
				lines: ["当前版本不要把“装备”当成主要成长目标，现阶段更该关注秘境和功法。", "如果今天事情很多，优先别丢的是：主线、功法、签到。"]
			}
		],
		footer: [
			{
				label: "上阶段",
				command: "/修仙帮助 1"
			},
			{
				label: "下阶段",
				command: "/修仙帮助 3"
			},
			{
				label: "秘境",
				command: "/查看秘境"
			},
			{
				label: "功法",
				command: "/我的功法"
			},
			{
				label: "通天塔",
				command: "/通天塔"
			},
			{
				label: "声望",
				command: "/商店 声望"
			},
			{
				label: "更多玩法",
				command: "/更多"
			}
		]
	},
	3: {
		title: "萌新帮助 · 第三阶段",
		subtitle: "炼气九层后，开始接入中期系统",
		sections: [
			{
				title: "玩法地图",
				lines: [
					"宗门：长期收益入口，负责签到、商店与后续活动接入。",
					"职业：开始形成丹药、灵田这类持续资源线。",
					"洞府：修行与职业经营的总览，包含炼丹、灵药、锻造和阵法入口。",
					"里程碑：筑基初期后开放，先知道入口即可。",
					"比试：筑基初期后开放，是面对面切磋线的一部分。",
					"道侣与通天塔五层开放；好友二层开放；排行榜与成就无境界限制。"
				]
			},
			{
				title: "优先顺序",
				lines: ["炼气九层可学习炼丹、创建宗门，并参加宗门主线、采矿和备战等玩法。", "成就、排行榜、通天塔先了解入口即可；里程碑和比试到筑基初期后再关注。"]
			},
			{
				title: "九层后先做什么",
				lines: [
					"宗门：四层即可加入；九层开放创建与进阶宗门活动。",
					"职业：七层可入门灵药师，九层可入门炼丹师。",
					"洞府：注册后即可查看总览，各房间按对应功能境界开放。"
				]
			},
			{
				title: "今日清单",
				lines: [
					"【1】 /我的宗门 或 /宗门列表：查看宗门与当前可参与的活动",
					"【2】 /我的职业：选择并开始接入炼丹师或灵药师",
					"【3】 /洞府：查看职业状态，再进入灵田、炼丹、锻造或阵法",
					"【4】 /我的功法：继续检查是否能学习或升级",
					"【5】 /成就：顺手领取前期已经完成的奖励"
				]
			},
			{
				title: "洞府与职业",
				lines: [
					"洞府整合修行与职业经营，职业状态和工具操作可在洞府查看。",
					"灵田独立负责播种、收割和加速；炼丹、锻造与阵法分别进入对应入口操作。",
					"按丹方备料：/一键播种 XXX丹 [炉数]，默认10炉，最多100炉，结合库存与田中作物补种。"
				]
			},
			{
				title: "卡关处理",
				lines: [
					"主线或境界仍卡住时，先回头看功法和突破。",
					"若挑战压力大，师门和组队仍然是最直接的过渡手段。",
					"如果当天推不动了，就把宗门签到、职业、闭关这类稳定收益做完。"
				]
			},
			{
				title: "别踩坑",
				lines: [
					"炼气九层前，装备主要仍从万宝楼补；炼气五层起可开始通过通天塔拿声望，转向声望商店补装备。",
					"九层后系统很多，不要一口气全研究，先抓住宗门、职业、功法三条线。",
					"洞府是修行与职业总览；灵田、炼丹、锻造与阵法各自保留实际规则。"
				]
			}
		],
		footer: [
			{
				label: "上阶段",
				command: "/修仙帮助 2"
			},
			{
				label: "通天塔",
				command: "/通天塔"
			},
			{
				label: "声望",
				command: "/商店 声望"
			},
			{
				label: "我的职业",
				command: "/我的职业"
			},
			{
				label: "我的宗门",
				command: "/我的宗门"
			},
			{
				label: "洞府",
				command: "/洞府"
			},
			{
				label: "更多玩法",
				command: "/更多"
			}
		]
	}
};
var help_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, parentNext] = useEvent();
	let access;
	try {
		const result = await runRobotBusiness(e, "navigation.help", {}, parseBackendNavigation, parentNext);
		if (result.handled) return;
		access = result.data;
	} catch {
		message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: "导航",
			content: Format.createMarkdown().addText("导航获取失败，请稍后再试。")
		}));
		return;
	}
	const soulNavigation = [{
		label: "我的主页",
		command: "/我"
	}];
	const isPrivate = e.isPrivate ?? false;
	const pageMatch = e.MessageText.match(/(\d+)/);
	if (!pageMatch) {
		const content = Format.createMarkdown();
		content.addText("从主页开始，点击按钮即可操作，不用记住所有指令。");
		content.addNewline();
		content.addBlockquote(Format.createMarkdown().addText("成长路线：主线 → 修为 → 突破／晋级 → 继续挑战。"));
		content.addBlockquote(Format.createMarkdown().addText("每日先签到，再打开任务面板查看当前可做、可领取的事项。"));
		content.addBlockquote(Format.createMarkdown().addText("装备、社交、宗门、活动与设置，在「更多」中按分类查找。"));
		content.addBlockquote(Format.createMarkdown().addText("更多内容可以查看 成长指引"));
		const visible = /* @__PURE__ */ new Set([...access.moreVisibleCommands, ...access.foldVisibleCommands]);
		const shortcuts = [
			{
				label: "主线",
				command: "/查看主线"
			},
			{
				label: "秘境",
				command: "/查看秘境"
			},
			{
				label: "境界",
				command: "/我的境界"
			},
			{
				label: "功法",
				command: "/我的功法"
			}
		].filter((item) => visible.has(item.command));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "修仙帮助",
			content,
			header: access.registered ? [{
				label: "签到",
				command: "/签到"
			}, {
				label: "任务面板",
				command: "/任务面板"
			}] : [],
			footer: access.registered ? [shortcuts, [
				{
					label: "成长指引",
					command: "/修仙帮助 1"
				},
				{
					label: "更多玩法",
					command: "/更多"
				},
				{
					label: "主页",
					command: "/我"
				}
			]] : [[{
				label: "踏入仙途",
				command: "/踏入仙途"
			}, {
				label: "成长指引",
				command: "/修仙帮助 1"
			}]]
		}));
		return;
	}
	let page = pageMatch ? parseInt(pageMatch[1]) : 1;
	if (page < 1) page = 1;
	if (page > 3) page = 3;
	const newcomerGuide = NEWCOMER_STAGE_GUIDES[page];
	if (newcomerGuide) {
		const content = Format.createMarkdown();
		content.addText(newcomerGuide.subtitle);
		content.addNewline();
		content.addNewline();
		for (const section of newcomerGuide.sections) {
			content.addBold(section.title);
			content.addNewline();
			for (const line of section.lines) content.addBlockquote(Format.createMarkdown().addText(`${line}`));
			content.addNewline();
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: newcomerGuide.title,
			content,
			footer: [...newcomerGuide.footer, ...soulNavigation]
		}));
	}
});

//#endregion
export { help_default as default };