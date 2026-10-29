import { parseBackendTianshuContent } from "../../api/bot/tianshu-content.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { mentionsRetiredFeature } from "../retiredFeatures.js";
import { selects } from "../config.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/tianshu/res.ts
var res_default = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = e.MessageText.match(/^(!|！|\/|#|＃)?天书(?:\s+([1-9]\d*|通用))?$/);
	if (!match) {
		next();
		return;
	}
	const [message] = useMessage$1();
	const md = Format.createMarkdown();
	let content;
	try {
		const loaded = await runRobotBusiness(e, "tianshu.content", {}, parseBackendTianshuContent, next);
		if (loaded.handled) return;
		content = loaded.data;
	} catch (error) {
		logger.error("查询天书失败:", error);
		md.addText("天书暂时不可用，请稍后重试。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "天书",
			content: md
		}));
		return;
	}
	const activeUnlocks = (unlocks) => unlocks.map((item) => ({
		...item,
		features: item.features.filter((feature) => !mentionsRetiredFeature(feature))
	})).filter((item) => item.features.length > 0);
	const addStage = (stage, current) => {
		md.addBold(`${current ? "当前大境界" : "下一大境界"}：${stage.stageName}`);
		md.addNewline();
		const unlocks = activeUnlocks(stage.unlocks);
		if (unlocks.length === 0) {
			md.addText("暂无明确的新功能解锁。");
			md.addNewline();
		}
		for (const item of unlocks) {
			md.addText(`${current ? (item.unlocked ? "已开放" : "待开放") + " · " : ""}${item.realm}`);
			md.addNewline();
			for (const feature of item.features) md.addBlockquote(Format.createMarkdown().addText(`- ${feature}`));
		}
		md.addNewline();
	};
	if (content.featureCatalog) {
		const stages = content.featureCatalog.filter((stage) => stage.stageLevel > 0).sort((a, b) => a.stageLevel - b.stageLevel);
		const browsing = match[2] !== void 0 && match[2] !== "通用";
		const page = Math.min(stages.length, Number(match[2] ?? 1));
		const current = content.currentStage;
		const selected = match[2] === "通用" ? content.featureCatalog.filter((stage) => stage.stageLevel === 0) : browsing ? stages.slice(page - 1, page) : content.featureCatalog.filter((stage) => stage.stageLevel === current?.stageLevel || stage.stageLevel === content.nextStage?.stageLevel);
		md.addText(current ? `当前境界：${current.realmName ?? current.stageName}` : "尚未踏入仙途");
		md.addNewline().addNewline();
		for (const stage of selected) {
			const label = browsing || match[2] === "通用" ? "" : stage.stageLevel === current?.stageLevel ? "当前大境界：" : "下一大境界：";
			md.addBold(`${label}${stage.stageName}`).addNewline();
			const features = stage.features.filter((feature) => !mentionsRetiredFeature(feature.name));
			if (!features.length) md.addText("此境界暂无新增玩法。").addNewline();
			for (const feature of features) {
				const detail = Format.createMarkdown().addText(feature.description);
				for (const condition of feature.conditions.filter((condition) => !mentionsRetiredFeature(condition))) detail.addNewline().addText(condition);
				md.addBold(`${feature.name} · ${feature.realmReached ? "已开放" : "待开放"} · ${feature.realm}`).addNewline();
				md.addBlockquote(detail);
			}
			md.addNewline();
		}
		if (!browsing && match[2] !== "通用" && current && !content.nextStage) md.addText("已至天书末境。").addNewline();
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "天书",
			content: md,
			nav: browsing && stages.length ? {
				current: page,
				total: stages.length,
				command: "/天书 {page}"
			} : void 0,
			footer: [
				{
					label: "当前与下境",
					selected: match[2] === void 0,
					command: "/天书"
				},
				{
					label: "从头翻阅",
					selected: browsing,
					command: "/天书 1"
				},
				{
					label: "通用",
					selected: match[2] === "通用",
					command: "/天书 通用"
				}
			]
		}));
		return;
	}
	md.addText(content.intro).addNewline().addNewline();
	if (content.currentStage || content.nextStage) {
		md.addText(content.currentStage ? `当前境界：${content.currentStage.realmName ?? content.currentStage.stageName}` : "当前暂无境界资料。");
		md.addNewline();
		md.addNewline();
		if (content.currentStage) addStage(content.currentStage, true);
		if (content.nextStage) addStage(content.nextStage, false);
		else md.addText("暂无下一大境界资料。");
	} else {
		for (const item of activeUnlocks(content.realmUnlocks)) {
			md.addBold(item.realm);
			md.addNewline();
			for (const feature of item.features) md.addBlockquote(Format.createMarkdown().addText(`- ${feature}`));
			md.addNewline();
		}
		md.addBold("附加条件");
		md.addNewline();
		for (const note of content.notes.filter((note) => !mentionsRetiredFeature(note))) md.addBlockquote(Format.createMarkdown().addText(`${note}`));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "天书",
		content: md
	}));
});

//#endregion
export { res_default as default };