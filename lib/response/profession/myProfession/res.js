import { commandText } from "../../../utils/commandPrefix.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, addOptions, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { buildBubble } from "../../presentation/bubble.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseProfessionDashboard } from "../../../api/bot/profession-dashboard-query.js";
import "../../presentation/index.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/profession/myProfession/res.ts
const LINGZHI_GUIDE_START_COMMAND = "/加入灵药师";
/**
* 洞府总览与职业面板共用服务端职业状态和交互。
* 灵田地块经营由 /我的灵田 独立承载。
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const isCaveHome = /^\s*[/#＃]?(?:我的洞府|洞府)(?:\s|$)/.test(e.MessageText ?? "");
	try {
		const [, next] = useEvent();
		const response = await runRobotBusiness(e, "profession.dashboard", {}, parseProfessionDashboard, next, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: isCaveHome ? "我的洞府" : reply.title,
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
			const { alchemy, lingzhi } = result.data;
			const rooms = [{
				title: "修行静室",
				lines: [],
				actions: [{
					label: "打坐",
					command: "/打坐"
				}]
			}];
			if (showAlchemy) rooms.push({
				title: "炼丹室",
				lines: alchemy.unlocked ? [`等级：${alchemy.level} · 经验：${alchemy.exp}${alchemy.nextExpRequired ? ` / ${alchemy.nextExpRequired}` : ""}`] : ["状态：尚未加入炼丹师"],
				actions: alchemy.unlocked ? [
					{
						label: "丹方",
						command: "/炼丹 丹方"
					},
					{
						label: "天工",
						command: "/炼丹 天工"
					},
					...alchemy.canAdvance ? [{
						label: "进阶",
						command: "/炼丹 进阶"
					}] : []
				] : [{
					label: "加入炼丹师",
					command: "/炼丹 入门"
				}]
			});
			if (showHerbalist) rooms.push({
				title: "灵药园",
				lines: lingzhi.unlocked ? [`等级：${lingzhi.level}${lingzhi.cultivatedCount === void 0 ? "" : ` · 已开垦：${lingzhi.cultivatedCount}块`}`] : ["状态：尚未开始灵药师指引"],
				actions: [lingzhi.unlocked ? {
					label: "经营灵田",
					command: "/灵田"
				} : {
					label: "加入灵药师",
					command: LINGZHI_GUIDE_START_COMMAND
				}]
			});
			if (allowed("forge")) rooms.push({
				title: "锻造坊",
				lines: [],
				actions: [
					{
						label: "锻造",
						command: "/我的锻造"
					},
					{
						label: "图纸",
						command: "/锻造图纸"
					},
					{
						label: "委托",
						command: "/锻造委托"
					}
				]
			});
			if (allowed("cave-formations")) rooms.push({
				title: "护府阵法",
				lines: [],
				actions: [{
					label: "查看阵法",
					command: "/洞府阵法"
				}]
			});
			rooms.push({
				title: "灵塘",
				lines: [],
				actions: [{
					label: "垂钓",
					command: "/垂钓",
					autoEnter: false
				}]
			});
			message.send(buildBubble({
				isPrivate,
				bid,
				title: "我的洞府",
				sections: rooms
			}));
			return;
		}
		if (/\s+灵药师\s*$/.test(e.MessageText ?? "")) {
			if (!showHerbalist && !result.data.lingzhi.unlocked) {
				message.send(FormatGui({
					isPrivate,
					bid,
					title: "草木之道",
					content: md.addText(locked("herbalist")),
					footer: [{
						label: "洞府",
						command: "/我的洞府"
					}]
				}));
				return;
			}
			const lingzhi = result.data.lingzhi;
			if (lingzhi.unlocked) md.addBlockquote(createQuoteMarkdown([
				`【${lingzhi.title}灵药师】等级 ${lingzhi.level}`,
				`成长经验：${lingzhi.exp}${lingzhi.nextExpRequired ? ` / ${lingzhi.nextExpRequired}` : ""}`,
				`照料与互动经验：${lingzhi.dailyExpGained}/${lingzhi.dailyExpCap}；收获经验不受此额度限制。`,
				`可开垦总上限 ${lingzhi.maxPlots}块 · 品阶上限 ${lingzhi.maxFieldGradeLabel} · 产量加成 +${lingzhi.yieldBonus}株`,
				...lingzhi.cultivatedCount === void 0 ? [] : [`已开垦：${lingzhi.cultivatedCount}块`],
				...lingzhi.cultivatableCount === void 0 ? [] : [`当前可开垦：${lingzhi.cultivatableCount}块（需备齐材料）`],
				...lingzhi.cultivationCostText ? [lingzhi.cultivationCostText] : []
			], [{
				label: "经营灵田",
				command: "/我的灵田"
			}]));
			else md.addBlockquote(createQuoteMarkdown(["【灵药师】尚未开启草木之道。"], [{
				label: "开始指引",
				command: LINGZHI_GUIDE_START_COMMAND
			}]));
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "草木之道",
				content: md,
				footer: [{
					label: "返回灵田",
					command: "/我的灵田"
				}, {
					label: "职业总览",
					command: "/我的职业"
				}]
			}));
			return;
		}
		/** 格式化装备行 */
		const formatEquipLine = (eq) => {
			if (eq.equipped) return `${eq.typeName}：${eq.equipmentName}（${eq.gradeName}）`;
			return `${eq.typeName}：未启用`;
		};
		const alchemyFooter = {
			recipes: {
				label: "丹方",
				command: "/炼丹 丹方"
			},
			continueGuide: {
				label: "加入炼丹师",
				command: "/炼丹 入门"
			},
			joinGuide: {
				label: "加入炼丹师",
				command: "/炼丹 入门"
			},
			none: null
		}[result.data.alchemy.primaryAction];
		if (showAlchemy && result.data.alchemy.showSection) {
			md.addText(`【${result.data.alchemy.unlocked ? `${result.data.alchemy.title}炼丹师` : "炼丹师"}】`);
			if (result.data.alchemy.unlocked) {
				const lines = [
					`等级：${result.data.alchemy.level}`,
					`经验：${result.data.alchemy.exp}${result.data.alchemy.nextExpRequired ? ` / ${result.data.alchemy.nextExpRequired}` : ""}`,
					`炼制次数：${result.data.alchemy.totalCrafts}`
				];
				md.addBlockquote(createQuoteMarkdown(lines));
				for (const eq of result.data.alchemy.equipments) {
					const options = [{
						label: "切换",
						command: "/炼丹 天工"
					}];
					if (eq.equipped && eq.equipmentName) options.push({
						label: "详情",
						command: `/物品详情 ${eq.equipmentName}`
					});
					md.addText(formatEquipLine(eq));
					addOptions(md, options);
				}
				const alchemyActions = Format.createMarkdown();
				alchemyActions.addButton(markdownButtonLabel("我的丹方"), { data: commandText("炼丹 丹方") });
				if (result.data.alchemy.canAdvance) alchemyActions.addText(" ").addButton(markdownButtonLabel("进阶"), { data: commandText("炼丹 进阶") });
				md.addBlockquote(alchemyActions);
			} else {
				md.addNewline();
				md.addText("尚未加入");
				addOptions(md, [{
					label: "加入炼丹师",
					command: "/炼丹 入门"
				}]);
			}
			md.addNewline();
			md.addNewline();
		}
		if (showHerbalist) {
			md.addText(`【${result.data.lingzhi.unlocked ? `${result.data.lingzhi.title}灵药师` : "灵药师"}】`);
			md.addNewline();
			if (result.data.lingzhi.unlocked) md.addBlockquote(createQuoteMarkdown([
				`等级：${result.data.lingzhi.level}`,
				`经验：${result.data.lingzhi.exp}${result.data.lingzhi.nextExpRequired ? ` / ${result.data.lingzhi.nextExpRequired}` : ""}`,
				`今日经验：${result.data.lingzhi.dailyExpGained}/${result.data.lingzhi.dailyExpCap}`,
				`可开垦总上限：${result.data.lingzhi.maxPlots}块`,
				...result.data.lingzhi.cultivatedCount === void 0 ? [] : [`已开垦：${result.data.lingzhi.cultivatedCount}块`],
				...result.data.lingzhi.cultivatableCount === void 0 ? [] : [`当前可开垦：${result.data.lingzhi.cultivatableCount}块（需备齐材料）`],
				...result.data.lingzhi.cultivationCostText ? [result.data.lingzhi.cultivationCostText] : [],
				`灵田上限：${result.data.lingzhi.maxFieldGradeLabel}`,
				`产量加成：+${result.data.lingzhi.yieldBonus}株`
			], [{
				label: "查看灵田",
				command: "/灵田"
			}]));
			else {
				md.addText("尚未开始灵药师指引");
				md.addNewline();
				addOptions(md, [{
					label: "开始指引",
					command: LINGZHI_GUIDE_START_COMMAND
				}]);
			}
			md.addNewline();
			md.addNewline();
		}
		if (!showAlchemy && !showHerbalist) md.addText("当前尚未开放职业，可查阅天书了解解锁条件。").addNewline();
		{
			const lingzhiFooter = result.data.lingzhi.primaryAction === "plots" ? {
				label: "灵田",
				command: "/灵田"
			} : {
				label: "加入灵药师",
				command: LINGZHI_GUIDE_START_COMMAND
			};
			const footerButtons = [showAlchemy ? alchemyFooter : null, showHerbalist ? lingzhiFooter : null].filter(Boolean);
			if (allowed("forge")) footerButtons.push({
				label: "锻造师",
				command: "/我的锻造"
			});
			footerButtons.push({
				label: "洞府",
				command: "/我的洞府"
			});
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "我的职业",
				content: md,
				footer: footerButtons
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