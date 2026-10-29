import { FormatGui, addOptions } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice, appendMiddlewareBlocks } from "../../middlewareReply.js";
import { EMPTY_STRING, FIRST_ARG_INDEX } from "../../../constants/common.js";
import "../../../constants/index.js";
import { parseSkillBookResetCancel, parseSkillBookResetConfirm, parseSkillBookResetPreview } from "../../../api/bot/skill-book-reset-reroll.js";
import { skillResetRecoveryTips } from "../../skillResetRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/skillBook/reset/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const text = (e.MessageText || "").trim();
	const mode = /^(!|！|\/|#|＃)?取消重制功法$/.test(text) ? "cancel" : /^(!|！|\/|#|＃)?确认重制功法$/.test(text) ? "confirm" : "preview";
	const resetText = text.replace(/^(!|！|\/|#|＃)?重制功法\s*/, "").trim();
	const args = resetText ? resetText.split(/\s+/) : [];
	const [, parentNext] = useEvent();
	const failure = adviceRenderer(async (reply) => {
		const md = Format.createMarkdown();
		if (reply.heading) md.addBold(reply.heading).addNewline();
		if (reply.rawLines) reply.rawLines.forEach((line, index) => {
			if (index) md.addNewline();
			md.addText(line);
		});
		else {
			if (reply.quote) md.addBlockquote(Format.createMarkdown().addText(reply.quote));
			const blocks = reply.blocks?.length ? reply.blocks : [{
				text: reply.text,
				quoted: false
			}];
			if (reply.blocks?.length && blocks.filter((block) => !block.quoted).map((block) => block.text).join("") !== reply.text && blocks.map((block) => block.text).join("") !== reply.text) md.addText(reply.text);
			for (const block of blocks) if (block.quoted) appendMiddlewareBlocks(md, [block]);
			else if (/^\n+$/.test(block.text)) for (const _ of block.text) md.addNewline();
			else {
				md.addText(block.text);
				if (block.inlineButtons?.length) addOptions(md, block.inlineButtons);
			}
		}
		const advice = [...reply.advice];
		for (const tip of skillResetRecoveryTips(reply.rawLines?.join("\n") ?? reply.text)) if (!advice.some((existing) => existing.command === tip.command)) advice.push({
			command: tip.command,
			description: `${tip.label}：${tip.description}`
		});
		appendMiddlewareAdvice(md, advice);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "功法重制",
			content: md,
			footer: reply.buttons.length ? reply.buttons : void 0
		}));
	});
	const response = await runRobotBusiness(e, "skill-books.reset", {
		mode,
		bookId: mode === "preview" ? args[0] ?? null : null
	}, (value) => {
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("重制响应不完整");
		const row = value;
		if (row.mode !== mode) throw new Error("重制响应模式错误");
		if (row.mode === "cancel") return {
			mode: "cancel",
			data: parseSkillBookResetCancel(row.pending)
		};
		if (row.mode === "confirm") return {
			mode: "confirm",
			data: parseSkillBookResetConfirm(row.result)
		};
		return {
			mode: "preview",
			data: parseSkillBookResetPreview(row.result)
		};
	}, parentNext, failure).catch(async () => {
		await failure({
			title: "",
			heading: "",
			text: "功法重制结果未获完整确认，请先核对功法、预览与返还状态。",
			buttons: [],
			advice: []
		});
		return { handled: true };
	});
	if (response.handled) return;
	if (response.data.mode === "cancel") {
		const result = response.data.data;
		const md = Format.createMarkdown();
		md.addText(result.success ? result.message : `❌ ${result.message}`);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "功法重制",
			content: md
		}));
		return;
	}
	if (response.data.mode === "confirm") {
		const result = response.data.data;
		const md = Format.createMarkdown();
		if (!result.success) md.addText(`❌ ${result.message}`);
		else {
			md.addBold("功法重制完成");
			md.addNewline();
			md.addText(result.message);
			if (result.skillBook) {
				md.addNewline();
				md.addText(`功法：【${result.skillBook.name}】【${result.skillBook.skillType}】`);
			}
			if (result.refundInfo) {
				md.addNewline();
				md.addNewline();
				md.addText(`返还经验：${result.refundInfo.exp}`);
				md.addNewline();
				md.addText(`返还灵石：${result.refundInfo.spiritStone}`);
				md.addNewline();
				md.addText(`重制等级：${result.refundInfo.upgradeCount} -> 0`);
				if (result.refundInfo.affectedAttrs.length > 0) {
					md.addNewline();
					md.addText(`重制词条：${result.refundInfo.affectedAttrs.join("、")}`);
					md.addNewline();
					md.addBlockquote(Format.createMarkdown().addText("整数词条重置为1，百分比词条重置为0.01"));
				}
				if (result.refundInfo.items && result.refundInfo.items.length > 0) {
					md.addNewline();
					md.addNewline();
					md.addText("返还残页");
					md.addNewline();
					for (const item of result.refundInfo.items) md.addBlockquote(Format.createMarkdown().addText(`${item.name} x${item.quantity}（${item.expValue}经验/个）`));
				}
			}
		}
		const footer = result.success && result.skillBook ? [{
			label: "查看功法",
			command: `/查看功法 ${result.skillBook.id}`
		}] : void 0;
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "功法重制",
			content: md,
			footer
		}));
		return;
	}
	const result = response.data.data;
	const md = Format.createMarkdown();
	if (!result.success) {
		md.addText(`❌ ${result.message}`);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "功法重制",
			content: md
		}));
		return;
	}
	const pending = result.pendingData;
	if (!pending || !result.refundInfo || !result.skillBook) {
		md.addText("❌ 功法重制预览生成失败");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "功法重制",
			content: md
		}));
		return;
	}
	md.addBold("功法重制预览");
	md.addNewline();
	md.addText(`功法：【${pending.skillBookName}】【${pending.gradeName}】【${pending.realmName}】`);
	md.addNewline();
	md.addText(`类型：${pending.skillType}`);
	md.addNewline();
	md.addText(`重制等级：${pending.upgradeCount} -> 0`);
	md.addNewline();
	md.addNewline();
	md.addText(`返还经验：${result.refundInfo.exp}（升级消耗的80%）`);
	md.addNewline();
	md.addText(`返还灵石：${result.refundInfo.spiritStone}（升级消耗的70%）`);
	md.addNewline();
	md.addBlockquote(Format.createMarkdown().addText("经验将按功法残页返还，不足最低残页面额的尾差会舍弃"));
	md.addText("重制词条");
	md.addNewline();
	if (result.refundInfo.affectedAttrs.length > 0) md.addBlockquote(Format.createMarkdown().addText(`${result.refundInfo.affectedAttrs.join("、")}`).addNewline().addText("整数词条将降为1，百分比词条将降为0.01"));
	else md.addBlockquote(Format.createMarkdown().addText("无激活词条，仅重置等级"));
	md.addNewline();
	md.addNewline();
	md.addText("预览有效期60秒 · 确认后重置，取消不执行");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "功法重制",
		content: md,
		footer: [{
			label: "确认重制",
			command: "/确认重制功法"
		}, {
			label: "取消",
			command: "/取消重制功法"
		}]
	}));
});

//#endregion
export { res_default as default };