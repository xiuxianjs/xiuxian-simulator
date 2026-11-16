import { commandText } from "../../../utils/commandPrefix.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { section } from "../../presentation/sections.js";
import { buildBubble } from "../../presentation/bubble.js";
import "../../presentation/index.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseProfessionDashboard } from "../../../api/bot/profession-dashboard-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { herbalGardenTabs } from "../../cavePlot/tabs.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/profession/myProfession/res.ts
const LINGZHI_GUIDE_START_COMMAND = "/加入灵药师";
/**
* 洞府总览与职业面板共用服务端职业状态和交互。
* 灵田地块经营由 /我的灵田 独立承载。
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const isCaveHome = /^\s*[/#＃]?(?:我的洞府|洞府)(?:\s|$)/.test(e.MessageText ?? "");
	const pane = /^\s*[/#＃]?\s*灵药师(?:\s+(指引))?\s*$/.exec(e.MessageText ?? "");
	if (!isCaveHome && !pane) {
		next();
		return;
	}
	try {
		const response = await runRobotBusiness(e, "profession.dashboard", isCaveHome ? { includeMeditationPreference: true } : {}, parseProfessionDashboard, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: isCaveHome ? "我的洞府" : "我的洞府 · 灵药园",
				content: Format.createMarkdown().addText(reply.text),
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		});
		if (response.handled) return;
		const result = { data: response.data };
		const md = Format.createMarkdown();
		const gates = result.data.access.features ?? {};
		const allowed = (id) => gates[id]?.realmReached === true;
		const locked = (id) => gates[id]?.lockedReason || "开放条件暂未提供，请稍后刷新。";
		const showAlchemy = allowed("alchemy");
		const showHerbalist = allowed("herbalist");
		if (isCaveHome) {
			const { meditationAutoBoost } = result.data;
			const nextBoostState = meditationAutoBoost ? "关闭" : "开启";
			const rooms = Format.createMarkdown();
			const addRoom = (text, button) => {
				rooms.addNewline().addText(text);
				if (button) rooms.addText(" ").addButton(markdownButtonLabel(button.label), {
					data: commandText(button.command),
					autoEnter: false
				});
			};
			rooms.addText("修行静室 ").addButton(markdownButtonLabel("打坐"), {
				data: commandText("/打坐"),
				autoEnter: false
			});
			addRoom(`闭关自动加速：${meditationAutoBoost === void 0 ? "暂不可读取" : meditationAutoBoost ? "开启" : "关闭"}`, meditationAutoBoost === void 0 ? void 0 : {
				label: nextBoostState,
				command: `/配置闭关自动加速 ${nextBoostState}`
			});
			if (showAlchemy) addRoom("炼丹房", {
				label: "前往炼丹",
				command: "/炼丹"
			});
			if (showHerbalist) addRoom("灵药园", {
				label: "前往种田",
				command: "/灵田"
			});
			if (allowed("forge")) addRoom("锻造坊", {
				label: "前往炼器",
				command: "/我的锻造"
			});
			addRoom("灵塘", {
				label: "前往垂钓",
				command: "/垂钓"
			});
			if (allowed("cave-formations")) addRoom("护府阵法", {
				label: "查看阵法",
				command: "/洞府阵法"
			});
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "我的洞府",
				content: md.addBlockquote(rooms)
			}));
			return;
		}
		if (pane) {
			const title = "我的洞府 · 灵药园";
			if (!showHerbalist && !result.data.lingzhi.unlocked) {
				message.send(buildBubble({
					isPrivate,
					bid,
					title,
					sections: [{ lines: [locked("herbalist")] }],
					footer: [{
						label: "洞府",
						command: "/我的洞府"
					}]
				}));
				return;
			}
			const lingzhi = result.data.lingzhi;
			if (pane[1] === "指引") {
				md.addBlockquote(section({
					lines: [
						"使用灵锄和灵土开垦空地，然后选择灵种播种。",
						"按地块状态浇灌、除虫或除草，成熟后收割。",
						"照料与互动经验有每日上限，收获经验另计。",
						...lingzhi.cultivationCostText ? [lingzhi.cultivationCostText] : []
					],
					actions: lingzhi.unlocked ? void 0 : [{
						label: "开始指引",
						command: LINGZHI_GUIDE_START_COMMAND
					}]
				}));
				if (lingzhi.unlocked) md.addNewline().addBlockquote(section({ lines: [
					`可开垦总上限：${lingzhi.maxPlots}块`,
					...lingzhi.cultivatedCount === void 0 ? [] : [`已开垦：${lingzhi.cultivatedCount}块`],
					...lingzhi.cultivatableCount === void 0 ? [] : [`当前可开垦：${lingzhi.cultivatableCount}块（需备齐材料）`]
				] }));
				message.send(FormatGui({
					isPrivate,
					bid,
					title,
					header: herbalGardenTabs("guide"),
					content: md,
					footer: [{
						label: "返回洞府",
						command: "/我的洞府"
					}]
				}));
				return;
			}
			const professionTitle = lingzhi.title.includes("灵药师") ? lingzhi.title : `${lingzhi.title}灵药师`;
			const lines = lingzhi.unlocked ? [
				professionTitle,
				`等级：${lingzhi.level}`,
				`经验：${lingzhi.exp}${lingzhi.nextExpRequired ? ` / ${lingzhi.nextExpRequired}` : ""}`
			] : ["灵药师", "状态：尚未加入"];
			md.addText("我的职业").addNewline();
			md.addBlockquote(section({
				lines,
				actions: lingzhi.unlocked ? void 0 : [{
					label: "开始指引",
					command: LINGZHI_GUIDE_START_COMMAND
				}]
			}));
			if (lingzhi.unlocked) {
				md.addNewline().addText("当前等级效果").addNewline();
				md.addBlockquote(section({ lines: [
					`最多开垦：${lingzhi.maxPlots}块`,
					`品阶上限：${lingzhi.maxFieldGradeLabel}`,
					`产量加成：+${lingzhi.yieldBonus}株`,
					`照料与互动经验每日上限：${lingzhi.dailyExpGained}/${lingzhi.dailyExpCap}`
				] }));
			}
			message.send(FormatGui({
				isPrivate,
				bid,
				title,
				header: herbalGardenTabs("profession"),
				content: md,
				footer: [...lingzhi.unlocked ? [] : [{
					label: "返回灵田",
					command: "/我的灵田"
				}], {
					label: "返回洞府",
					command: "/我的洞府"
				}]
			}));
		}
	} catch (error) {
		logger.error(isCaveHome ? "获取洞府信息失败:" : "获取职业信息失败:", error);
		const md = Format.createMarkdown();
		md.addText(isCaveHome ? "获取洞府信息失败，请稍后重试" : "获取职业信息失败，请稍后重试");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };