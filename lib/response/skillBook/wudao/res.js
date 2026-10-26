import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../../middlewareReply.js";
import { skillInventoryRecoveryTips } from "../../skillInventoryRecovery.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseWudaoOptions, parseWudaoResult } from "../../../api/bot/skill-book-wudao.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/skillBook/wudao/res.ts
/**
* 构建悟道属性选择按钮（用于提示阶段）。
*/
const buildAttrButtons = (userSkillBookId, labels) => {
	const rows = [];
	const perRow = 3;
	for (let i = 0; i < labels.length; i += perRow) {
		const slice = labels.slice(i, i + perRow);
		rows.push(slice.map((label) => ({
			label,
			command: `/悟道 ${userSkillBookId} ${label}`
		})));
	}
	return rows;
};
/**
* /悟道 {已学功法id} [属性]
* - 消耗 1 个【悟道石】
* - 不提供属性时展示可选属性，并通过按钮 /悟道 {id} {属性} 一次性触发
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const normalized = String(e.MessageText ?? "").trim().replace(/^(!|！|\/|#|＃)?/, "").trim();
	if (!normalized.startsWith("悟道")) return;
	const rest = normalized.replace(/^悟道\s*/, "").trim();
	const parts = rest ? rest.split(/\s+/) : [];
	const skillBookIdStr = parts[0] ?? "";
	const chosenLabel = parts.slice(1).join(" ").trim();
	const [, parentNext] = useEvent();
	const validBookId = /^\d+$/.test(skillBookIdStr) && Number.isSafeInteger(Number(skillBookIdStr)) && Number(skillBookIdStr) > 0;
	const isSpendCommand = (command) => /^[/!！#＃]?悟道\s+\S+\s+\S/.test(command.trim());
	const feedback = adviceRenderer(async (reply) => {
		const safeReply = {
			...reply,
			buttons: reply.buttons.filter((button) => !isSpendCommand(button.command)),
			advice: reply.advice.filter((tip) => !isSpendCommand(tip.command)),
			...reply.blocks ? { blocks: reply.blocks.map((block) => ({
				...block,
				...block.inlineButtons ? { inlineButtons: block.inlineButtons.filter((button) => !isSpendCommand(button.command)) } : {}
			})) } : {}
		};
		const recovered = withBusinessRecovery("skill-books.wudao", safeReply);
		const refresh = `/悟道 ${skillBookIdStr}`;
		if (validBookId && !recovered.advice.some((tip) => tip.command === refresh)) recovered.advice = [...recovered.advice, {
			command: refresh,
			description: "重新核对悟道条件：只读取当前候选，不消耗悟道石；先核对原属性与回执，再决定是否选择属性，不直接重放旧消耗"
		}];
		await sendMiddlewareReply(e, recovered, "footer");
	});
	if (parts.length > 2 || skillBookIdStr && !validBookId) {
		await feedback({
			title: "",
			heading: "",
			text: "参数错误：使用本人已学功法的完整正整数实例编号及一个属性名，不附确认或其他文字。",
			buttons: [],
			advice: []
		});
		return;
	}
	const response = await runRobotBusiness(e, "skill-books.wudao", {
		bookId: skillBookIdStr || null,
		label: chosenLabel
	}, (value) => {
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("悟道响应不完整");
		const row = value;
		if (typeof row.bookId !== "number" || !Number.isSafeInteger(row.bookId) || row.bookId <= 0) throw new Error("悟道响应字段无效: skillBookId");
		const options = parseWudaoOptions(row.options);
		const result = row.result === null ? null : parseWudaoResult(row.result);
		const invalidOptions = !Number.isSafeInteger(options.ownedStones) || options.ownedStones < 1 || !options.options.length || options.options.some((option) => !option.key || !/^\S+$/.test(option.label) || option.currentMax <= 0 || option.templateMax <= option.currentMax);
		if (options.status !== "ready" || row.bookId !== Number(skillBookIdStr) || options.skillBookId !== row.bookId || invalidOptions || (chosenLabel ? !result : result !== null)) throw new Error("悟道响应不完整");
		if (result && (result.skillBookId !== row.bookId || result.label !== chosenLabel || !options.options.some((option) => option.key === result.key && option.label === result.label && option.isPercent === result.isPercent) || !Number.isSafeInteger(result.remaining) || result.remaining < 0 || result.growth <= 0 || result.newMax <= result.oldMax || result.newMax > result.templateMax)) throw new Error("悟道结算响应不完整");
		return {
			bookId: row.bookId,
			options,
			result
		};
	}, parentNext, feedback).catch(async () => {
		await feedback({
			title: "",
			heading: "",
			text: "悟道结果未获完整确认，请先核对当前上限、悟道石与原回执。",
			buttons: [],
			advice: []
		});
		return { handled: true };
	});
	if (response.handled) return;
	const userSkillBookId = response.data.bookId;
	const { skillBookName, ownedStones: ownedQty, options: available } = response.data.options;
	const labels = available.map((x) => x.label);
	if (!chosenLabel) {
		const md = Format.createMarkdown();
		md.addBold("悟道");
		md.addNewline();
		md.addText(`目标功法：【${skillBookName}】`);
		md.addNewline();
		md.addText(`将消耗：悟道石 x1（当前拥有：${ownedQty}）`);
		md.addNewline().addText("选择属性后消耗悟道石×1");
		md.addNewline();
		md.addNewline();
		md.addNewline();
		md.addNewline();
		md.addText("可选\"上限属性\"：");
		md.addNewline();
		available.forEach((cfg) => {
			const suffix = cfg.isPercent ? "%" : "";
			md.addText(`• ${cfg.label}：${cfg.currentMaxText}${suffix} / ${cfg.templateMaxText}${suffix}`);
			md.addNewline();
		});
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: buildAttrButtons(userSkillBookId, labels)
		}));
		return;
	}
	const data = response.data.result;
	const suffix = data.isPercent ? "%" : "";
	const growthText = data.growthText;
	const newMaxText = data.newMaxText;
	const templateMaxText = data.templateMaxText;
	const md = Format.createMarkdown();
	md.addBold("悟道成功");
	md.addNewline();
	md.addText(`功法：【${data.skillBookName}】`);
	md.addNewline();
	md.addText(`属性：${data.label}`);
	md.addNewline();
	md.addText(`上限提升：+${growthText}${suffix}`);
	md.addNewline();
	md.addText(`当前上限：${newMaxText}${suffix} / ${templateMaxText}${suffix}`);
	md.addNewline();
	md.addNewline();
	md.addText(`剩余悟道石：${data.remaining}`);
	md.addNewline();
	if (data.remaining === 0) appendMiddlewareAdvice(md, skillInventoryRecoveryTips("skill-books.wudao", "悟道石不足"));
	else if (data.newMax === data.templateMax) appendMiddlewareAdvice(md, skillInventoryRecoveryTips("skill-books.wudao", "该属性已达到模板约定上限"));
	const successFooter = [{
		label: data.remaining === 0 ? "核对悟道条件" : "继续悟道",
		command: `/悟道 ${userSkillBookId}`
	}, {
		label: "查看功法",
		command: `/查看功法 ${userSkillBookId}`
	}];
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: successFooter
	}));
});

//#endregion
export { res_default as default };