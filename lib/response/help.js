import { buildBubble } from "./presentation/bubble.js";
import { errorBubble } from "./presentation/presets.js";
import "./presentation/index.js";
import { useMessage as useMessage$1 } from "../utils/useMessage.js";
import { selects } from "./config.js";
import { runRobotBusiness } from "./robotBusiness.js";
import { helpTopic, parsePersonalHelp, personalHelpBubble } from "./help-personal.js";
import { onResponse, useEvent } from "alemonjs";

//#region src/response/help.ts
const guides = [
	{
		title: "成长指引 · 初入仙途",
		sections: [
			{
				title: "今天先做什么",
				lines: ["进度：签到领资源，打开「初入仙途」看新人目标，再推进主线。"]
			},
			{
				title: "主线卡关",
				lines: ["条件：修为满了先突破；修为不足可扫荡已通关关卡。还打不过，可以拜师或组队。"]
			},
			{
				title: "下线前",
				lines: ["奖励：闭关积累真气与修为。"]
			}
		],
		shortcuts: [
			{
				label: "签到",
				command: "/签到"
			},
			{
				label: "初入仙途",
				command: "/初入仙途"
			},
			{
				label: "主线",
				command: "/查看主线"
			},
			{
				label: "秘境",
				command: "/查看秘境"
			}
		]
	},
	{
		title: "成长指引 · 炼气二至九层",
		sections: [
			{
				title: "日常成长",
				lines: ["进度：签到、推主线，修为满了就突破或晋级。秘境可补材料和功法，记得检查能否学习或升级功法。"]
			},
			{
				title: "逐步解锁",
				lines: ["条件：二层开放师门和组队，四层可加入宗门，五层可挑战通天塔，七层开放灵田和灵药师。具体开放条件可查「天书」。"],
				actions: [{
					label: "天书",
					command: "/天书"
				}]
			},
			{
				title: "补装备",
				lines: ["奖励：通天塔可获得声望，再到声望商店兑换装备。"]
			}
		],
		shortcuts: [
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
				label: "声望商店",
				command: "/商店 声望"
			}
		]
	},
	{
		title: "成长指引 · 炼气九层起",
		sections: [
			{
				title: "宗门与职业",
				lines: ["条件：炼气九层可创建宗门、学习炼丹。已加入宗门可查看签到、采矿与备战入口。"]
			},
			{
				title: "洞府经营",
				lines: ["说明：从洞府进入灵田、炼丹、锻造或阵法，查看各玩法的开放条件和材料。"]
			},
			{
				title: "筑基以后",
				lines: ["条件：筑基初期开放里程碑和比试。主线卡关时，先检查功法和境界。"]
			}
		],
		shortcuts: [
			{
				label: "我的宗门",
				command: "/我的宗门"
			},
			{
				label: "我的职业",
				command: "/我的职业"
			},
			{
				label: "洞府",
				command: "/洞府"
			},
			{
				label: "通天塔",
				command: "/通天塔"
			}
		]
	}
];
var help_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const context = {
		isPrivate: e.isPrivate ?? false,
		bid: e.UserId
	};
	const argument = e.MessageText.trim().match(/(?:修仙)?帮助(?:\s+(.*))?$/u)?.[1]?.trim() ?? "";
	const pageArg = /^\d+$/.test(argument) ? argument : void 0;
	const topic = helpTopic(argument);
	let access;
	try {
		const result = await runRobotBusiness(e, "navigation.help", pageArg === void 0 ? { topic: topic === "unknown" ? "overview" : topic } : {}, parsePersonalHelp, next);
		if (result.handled) return;
		access = result.data;
	} catch {
		await message.send(errorBubble({
			...context,
			title: "修仙帮助",
			reason: "帮助暂时无法打开，请稍后再试。"
		}));
		return;
	}
	const home = {
		label: "主页",
		command: "/我"
	};
	const more = {
		label: "更多玩法",
		command: "/更多"
	};
	const register = {
		label: "踏入仙途",
		command: "/踏入仙途"
	};
	const returnHelp = {
		label: "返回帮助",
		command: "/帮助"
	};
	if (pageArg === void 0) {
		await message.send(access.registered ? personalHelpBubble(context, topic, access.progress) : buildBubble({
			...context,
			title: "修仙帮助",
			bar: false,
			sections: [{
				title: "开始修仙",
				lines: ["说明：踏入仙途后，即可查看自己的进度和下一步。"]
			}],
			footer: [register, {
				label: "成长指引",
				command: "/帮助 1"
			}]
		}));
		return;
	}
	const page = Math.min(guides.length, Math.max(1, Number(pageArg)));
	const guide = guides[page - 1];
	await message.send(buildBubble({
		...context,
		title: guide.title,
		bar: access.registered ? void 0 : false,
		sections: guide.sections,
		nav: {
			current: page,
			total: guides.length,
			command: "/帮助 {page}"
		},
		footer: access.registered ? [guide.shortcuts, [
			returnHelp,
			more,
			home
		]] : [returnHelp, register]
	}));
});

//#endregion
export { help_default as default };