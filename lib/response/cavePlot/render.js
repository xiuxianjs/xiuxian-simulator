import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { appendTreasureEffects } from "../treasureEffects.js";
import { appendMiddlewareAdvice } from "../middlewareReply.js";
import { caveRecoveryTips } from "../caveRecovery.js";
import { cavePageForPlot, paginateCaveItems } from "./pagination.js";
import { Format } from "alemonjs";

//#region src/response/cavePlot/render.ts
function appendCaveQueryAdvice(md, operation, text) {
	appendMiddlewareAdvice(md, caveRecoveryTips(operation, text).map((tip) => ({
		command: tip.command,
		description: `${tip.label}：${tip.description}`
	})));
}
const FUNCTION_BUTTONS = [{
	label: "灵药师",
	command: "/我的职业 灵药师"
}, {
	label: "药圃经营",
	command: "/我的灵田 经营"
}];
const ACCELERATION_BUTTONS = [{
	label: "一键灵田加速",
	command: "/一键灵田加速"
}, {
	label: "一键灵田催熟",
	command: "/一键灵田催熟"
}];
const BATCH_OPERATION_BUTTONS = [
	{
		label: "开垦所有",
		command: "/开垦所有",
		availabilityLabel: "开垦"
	},
	{
		label: "一键收割",
		command: "/一键收割",
		availabilityLabel: "收割"
	},
	{
		label: "一键浇灌",
		command: "/一键浇灌",
		availabilityLabel: "浇灌"
	},
	{
		label: "一键除虫",
		command: "/一键除虫",
		availabilityLabel: "除虫"
	},
	{
		label: "一键除草",
		command: "/一键除草",
		availabilityLabel: "除草"
	}
];
const RECORD_BUTTON = {
	label: "记录",
	command: "/灵田记录"
};
function appendPlotBlock(md, plot, action) {
	const quote = Format.createMarkdown().addText(`【${plot.plotIndex}】${plot.title}`);
	for (const button of Array.isArray(action) ? action : action ? [action] : []) quote.addText(" ").addButton(markdownButtonLabel(`${button.label}`), { data: button.command });
	if (plot.detail) {
		quote.addNewline();
		quote.addText(`  ${plot.detail}`);
	}
	md.addBlockquote(quote);
}
function pickVisiblePlots(plots) {
	return (plots ?? []).filter((plot) => plot.plotState === "cultivated");
}
function buildSelfCavePlotContent(plots, leadText, stasisFormation, page, advice = [], cultivationCostText, treasureEffects) {
	const md = Format.createMarkdown();
	const allPlots = plots ?? [];
	const items = allPlots.filter((plot) => plot.plotState !== "locked");
	const pagination = paginateCaveItems(items, page, "/我的灵田 页 {page}");
	const availableActionLabels = new Set(allPlots.flatMap((plot) => plot.actions?.map((action) => action.label) ?? []));
	if (stasisFormation) {
		md.addBold(stasisFormation.name);
		md.addText(" 生效中，");
		md.addText(stasisFormation.remainingText);
		md.addNewline();
		md.addNewline();
	}
	if (leadText) {
		md.addText(leadText);
		appendTreasureEffects(md, treasureEffects);
		appendMiddlewareAdvice(md, advice);
		if (items.length > 0 || treasureEffects?.length) {
			md.addNewline();
			md.addNewline();
		}
	}
	const count = (label) => allPlots.filter((plot) => plot.actions?.some((action) => action.label === label)).length;
	const careCount = allPlots.filter((plot) => plot.actions?.some((action) => [
		"浇灌",
		"除虫",
		"除草"
	].includes(action.label))).length;
	const summary = [
		["可收获", count("收割")],
		["待照料", careCount],
		["空闲", count("播种")]
	].filter(([, amount]) => Number(amount) > 0).map(([label, amount]) => `${label}${amount}块`);
	if (summary.length > 0) md.addText(summary.join(" · ")).addNewline();
	md.addText(`已开垦${allPlots.filter((plot) => plot.plotState === "cultivated").length}块 · 当前可开垦${count("开垦")}块（需备齐材料）`).addNewline();
	if (cultivationCostText) md.addText(cultivationCostText).addNewline();
	if (items.length > 0) pagination.items.forEach((plot, index) => {
		const dailyActions = plot.actions?.filter((action) => action.label !== "升级") ?? [];
		const detail = plot.detail.replace(/\n升级至\d+阶需消耗[^\n]*/g, "");
		const quote = Format.createMarkdown().addText(`【${plot.plotIndex}】${plot.title}`).addNewline().addText(detail);
		for (const action of dailyActions) quote.addText(" ").addButton(markdownButtonLabel(`${action.label}`), { data: action.command });
		quote.addText(" ").addButton(markdownButtonLabel("详情"), { data: `/我的灵田 地块 ${plot.plotIndex}` });
		md.addBlockquote(quote);
		if (index < pagination.items.length - 1) md.addNewline();
	});
	else if (!leadText) md.addText("暂无灵田信息。");
	const operationButtons = BATCH_OPERATION_BUTTONS.filter((button) => availableActionLabels.has(button.availabilityLabel ?? button.label));
	if (careCount > 0 || count("收割") > 0) operationButtons.unshift({
		label: "一键打理",
		command: "/一键打理灵田"
	});
	return {
		content: md,
		nav: pagination.nav,
		functionButtons: [...FUNCTION_BUTTONS],
		qqOperationButtons: [...operationButtons, ...availableActionLabels.has("播种") ? [{
			label: "播种空田",
			command: "/播种"
		}] : []]
	};
}
function sendSelfCavePlotPage(options) {
	const { title, bid, isPrivate, message, plots, leadText, stasisFormation } = options;
	const { content, nav, functionButtons, qqOperationButtons } = buildSelfCavePlotContent(plots, leadText, stasisFormation, options.page, options.advice, options.cultivationCostText, options.treasureEffects);
	const targetBid = typeof bid === "string" ? bid : bid === void 0 ? void 0 : String(bid);
	if (options.showManagement || options.selectedPlotIndex !== void 0) {
		const md = Format.createMarkdown();
		const selected = options.selectedPlotIndex === void 0 ? void 0 : plots?.find((plot) => plot.plotIndex === options.selectedPlotIndex);
		if (options.selectedPlotIndex !== void 0) {
			if (selected) {
				const quote = Format.createMarkdown().addText(`【${selected.plotIndex}】${selected.title}`).addNewline().addText(selected.detail);
				for (const action of selected.actions ?? []) quote.addText(" ").addButton(markdownButtonLabel(`${action.label}`), { data: action.command });
				md.addBlockquote(quote);
			} else {
				md.addText("未找到这块灵田。");
				appendCaveQueryAdvice(md, "cave.view", "未找到这块灵田");
			}
		} else {
			const quote = Format.createMarkdown().addText("【药圃经营】阵法、访友与经营记录").addNewline();
			for (const action of [
				{
					label: "阵法",
					command: "/洞府阵法"
				},
				{
					label: "访友",
					command: "/附近灵田"
				},
				RECORD_BUTTON,
				{
					label: "全部操作",
					command: "/我的灵田 操作"
				}
			]) quote.addText(" ").addButton(markdownButtonLabel(`${action.label}`), { data: action.command });
			md.addBlockquote(quote);
		}
		message.send(FormatGui({
			isPrivate,
			bid: targetBid,
			title: selected ? `第${selected.plotIndex}块灵田` : "药圃经营",
			content: md,
			footer: [{
				label: "返回灵田",
				command: options.selectedPlotIndex !== void 0 ? `/我的灵田 页 ${cavePageForPlot((plots ?? []).filter((plot) => plot.plotState !== "locked"), options.selectedPlotIndex)}` : "/我的灵田"
			}]
		}));
		return;
	}
	if (options.showOperations) {
		const md = Format.createMarkdown();
		const availablePlots = (plots ?? []).filter((plot) => plot.actions?.length);
		const pagination = paginateCaveItems(availablePlots, options.page, "/我的灵田 操作 页 {page}");
		md.addText(`当前可开垦${availablePlots.filter((plot) => plot.actions?.some((action) => action.label === "开垦")).length}块（需备齐材料）`).addNewline();
		if (options.cultivationCostText) md.addText(options.cultivationCostText).addNewline();
		for (const plot of pagination.items) {
			const quote = Format.createMarkdown().addText(`【${plot.plotIndex}】${plot.title}`);
			for (const action of plot.actions ?? []) quote.addText(" ").addButton(markdownButtonLabel(`${action.label}`), { data: action.command });
			quote.addNewline().addText(plot.detail);
			md.addBlockquote(quote);
		}
		if (!availablePlots.length) md.addText("暂无可用操作");
		const canPlant = availablePlots.some((plot) => plot.actions?.some((action) => action.label === "播种"));
		const canCultivate = availablePlots.some((plot) => plot.actions?.some((action) => action.label === "开垦"));
		message.send(FormatGui({
			isPrivate,
			bid: targetBid,
			title: "灵田操作",
			content: md,
			nav: pagination.nav,
			footer: [
				...ACCELERATION_BUTTONS,
				...canCultivate ? [{
					label: "开垦所有",
					command: "/开垦所有"
				}] : [],
				...canPlant ? [{
					label: "播种空田",
					command: "/播种"
				}] : [],
				{
					label: "返回灵田",
					command: "/我的灵田"
				}
			]
		}));
		return;
	}
	message.send(FormatGui({
		isPrivate,
		bid: targetBid,
		title,
		header: [{
			label: "洞府",
			command: "/我的洞府"
		}, ...functionButtons],
		content,
		nav,
		footer: [ACCELERATION_BUTTONS, qqOperationButtons]
	}));
}
function sendCavePlotLogPage(options) {
	const { title, bid, isPrivate, message, logs, page, totalPages, total } = options;
	const md = Format.createMarkdown();
	const targetBid = typeof bid === "string" ? bid : bid === void 0 ? void 0 : String(bid);
	if (logs.length === 0) {
		md.addText("暂无灵田记录。");
		appendCaveQueryAdvice(md, "cave.logs", "当前页没有灵田记录");
	} else logs.forEach((log, index) => {
		md.addBlockquote(Format.createMarkdown().addText(`${log}`));
		if (index < logs.length - 1) {
			md.addNewline();
			md.addNewline();
		}
	});
	message.send(FormatGui({
		isPrivate,
		bid: targetBid,
		title,
		header: FUNCTION_BUTTONS,
		footer: [{
			label: "我的灵田",
			command: "/灵田"
		}],
		content: md,
		nav: totalPages > 1 ? {
			current: page,
			total: totalPages,
			count: total,
			command: "/灵田记录 {page}"
		} : void 0
	}));
}
function sendPlantSeedPromptPage(options) {
	const { title, bid, isPrivate, message, plots, leadText, targetLabel, remainingPlots, commandPrefix, options: seedOptions } = options;
	const md = Format.createMarkdown();
	const targetBid = typeof bid === "string" ? bid : bid === void 0 ? void 0 : String(bid);
	const pagination = paginateCaveItems(seedOptions, options.page, `${commandPrefix} 页 {page}`);
	if (leadText) {
		md.addText(leadText);
		if (seedOptions.length > 0) {
			md.addNewline();
			md.addNewline();
		}
	}
	md.addText(`目标：${targetLabel}`);
	if (remainingPlots > 1) md.addText(`（剩余${remainingPlots}块）`);
	md.addNewline();
	md.addNewline();
	if (seedOptions.length > 0) pagination.items.forEach((seed, index) => {
		const seedMd = Format.createMarkdown().addText(`${seed.seedName} · 库存${seed.quantity}颗 · ${seed.matureHours}小时成熟`);
		seedMd.addText(" ");
		seedMd.addButton(markdownButtonLabel("播种"), { data: `${commandPrefix} ${seed.seedName}` });
		md.addBlockquote(seedMd);
		if (index < pagination.items.length - 1) md.addNewline();
	});
	else md.addText("暂无可播种的灵种");
	message.send(FormatGui({
		isPrivate,
		bid: targetBid,
		title,
		content: md,
		nav: pagination.nav,
		footer: [{
			label: "返回灵田",
			command: `/我的灵田 页 ${cavePageForPlot((plots ?? []).filter((plot) => plot.plotState !== "locked"), Number(commandPrefix.match(/^\/播种 (\d+)$/)?.[1]))}`
		}, ...seedOptions.length === 0 ? [{
			label: "万宝楼",
			command: "/商店 万宝楼"
		}, {
			label: "储物袋",
			command: "/储物袋"
		}] : []]
	}));
}
function sendLingzhiGuidePromptPage(options) {
	const { title, bid, isPrivate, message, leadText } = options;
	const md = Format.createMarkdown();
	const targetBid = typeof bid === "string" ? bid : bid === void 0 ? void 0 : String(bid);
	md.addText(leadText ?? "灵药师尚未入门");
	message.send(FormatGui({
		isPrivate,
		bid: targetBid,
		title,
		content: md,
		footer: [{
			label: "加入灵药师",
			command: "/加入灵药师"
		}, {
			label: "我的职业",
			command: "/我的职业"
		}]
	}));
}
function sendProfessionAndCaveLockedPage(options) {
	const { title, bid, isPrivate, message, leadText } = options;
	const md = Format.createMarkdown();
	const targetBid = typeof bid === "string" ? bid : bid === void 0 ? void 0 : String(bid);
	md.addText(leadText ?? "炼气九层及以上方可使用洞府与职业系统。");
	message.send(FormatGui({
		isPrivate,
		bid: targetBid,
		title,
		content: md,
		footer: [{
			label: "我的境界",
			command: "/我的境界"
		}]
	}));
}
function sendVisitedCavePlotPage(options) {
	const { title, bid, isPrivate, message, overview, leadText, footer } = options;
	const md = Format.createMarkdown();
	const visiblePlots = overview.canViewPlots ? pickVisiblePlots(overview.plots) : [];
	const pagination = paginateCaveItems(visiblePlots, options.page, `/查看灵田 ${overview.ownerUid} 页 {page}`);
	const targetBid = typeof bid === "string" ? bid : bid === void 0 ? void 0 : String(bid);
	const footerButtons = footer?.slice(0, 3) ?? [];
	if (leadText) {
		md.addText(leadText);
		appendTreasureEffects(md, options.treasureEffects);
		md.addNewline();
		md.addNewline();
	}
	md.addText(`${overview.ownerName} · ${overview.relationLabel}`);
	md.addNewline();
	md.addText(`洞府灵气：${overview.auraText}`);
	md.addNewline();
	md.addText(overview.stolenStatusText);
	if (!overview.canViewPlots) {
		md.addNewline();
		md.addText(overview.summary);
		appendCaveQueryAdvice(md, "cave.visit", "当前只显示访问概览");
		md.addNewline();
	}
	if (!overview.canViewPlots) md.addNewline();
	else if (visiblePlots.length > 0) {
		md.addNewline();
		md.addNewline();
		pagination.items.forEach((plot, index) => {
			appendPlotBlock(md, plot, plot.actions);
			if (index < pagination.items.length - 1 || overview.recentLogs.length > 0) md.addNewline();
		});
		if (overview.recentLogs.length > 0) md.addBlockquote(Format.createMarkdown().addText(`  ${overview.recentLogs[0]}`));
	} else {
		md.addNewline().addText("当前没有返回可查看的已开垦地块。");
		appendCaveQueryAdvice(md, "cave.visit", "可见地块列表为空");
	}
	message.send(FormatGui({
		isPrivate,
		bid: targetBid,
		title,
		content: md,
		nav: pagination.nav,
		footer: footerButtons
	}));
}

//#endregion
export { sendCavePlotLogPage, sendLingzhiGuidePromptPage, sendPlantSeedPromptPage, sendProfessionAndCaveLockedPage, sendSelfCavePlotPage, sendVisitedCavePlotPage };