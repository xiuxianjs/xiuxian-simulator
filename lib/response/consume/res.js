import { createBackendRequestContext } from "../../api/bot/context.js";
import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { appendMiddlewareAdvice, sendMiddlewareReply } from "../middlewareReply.js";
import { EMPTY_STRING } from "../../constants/common.js";
import "../../constants/index.js";
import { withBusinessRecovery } from "../businessRecovery.js";
import { selects } from "../config.js";
import { consumeInputProblem } from "../consumeArguments.js";
import { loadFinalBusiness } from "../finalBusiness.js";
import { parseConsumeResult } from "../../api/bot/consume.js";
import { parseSoulRefineCommand } from "../../api/bot/soul-artifact-commands.js";
import App from "../../response-apps/consume/app.js";
import { sendOnboardingFollowup } from "../onboarding/followup.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/consume/res.ts
/**
* 统一道具消耗指令处理器
* 指令格式: /消耗 {物品名称} {数量?}
*
* 注意：/消耗、/服用、/学习丹方 仅接受物品名称，不支持纯数字ID
*       /炼化 数字先查本命物实例；未命中时按道具储物袋实例消耗，不等同模板ID
*
* 支持所有 type='prop' 的道具：
*   - 丹药(pill): 服用丹药，触发对应效果
*   - 丹方(danfang): 学习丹方配方
*   - 其他(other): 通用消耗
*
* 也兼容旧指令 /服用、/学习丹方
*/
const response = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? e.name.startsWith("private.");
	const rawText = (e.MessageText || "").trim();
	const parts = rawText.replace(/^(!|！|\/|#|＃)?(消耗|服用|学习丹方|炼化)\s*/, "").trim().split(/\s+/);
	const refining = /^(!|！|\/|#|＃)?炼化/.test(rawText) && /^\d+$/.test(parts[0]);
	const operation = refining ? "soul-artifacts.refine" : "items.consume";
	const problem = consumeInputProblem(rawText);
	if (problem) {
		await sendMiddlewareReply(e, withBusinessRecovery(operation, {
			title: "操作未完成",
			heading: "",
			text: problem,
			buttons: [],
			advice: []
		}));
		return;
	}
	const invalid = !parts[0] || !refining && /^\d+$/.test(parts[0]) || !refining && parts[1] !== void 0 && (isNaN(parseInt(parts[1], 10)) || parseInt(parts[1], 10) < 1);
	const loaded = refining ? await loadFinalBusiness(e, next, "soul-artifacts.refine", {
		instanceId: Number(parts[0]),
		confirmed: parts[1] === "确认"
	}, parseSoulRefineCommand) : await loadFinalBusiness(e, next, "items.consume", invalid ? { mode: "usage" } : {
		itemName: parts[0],
		quantity: parts[1] ? parseInt(parts[1], 10) : 1
	}, (value) => invalid ? void 0 : parseConsumeResult(value));
	if (loaded.handled) return;
	const uid = e.uid;
	const result = await App({
		consume: loaded.load,
		refine: loaded.load,
		bid,
		uid,
		rawText,
		request: createBackendRequestContext(e)
	});
	switch (result.code) {
		case "SOUL_ARTIFACT_EQUIP": {
			const md = Format.createMarkdown();
			const displayMsg = result.data.message;
			md.addText(displayMsg);
			md.addText(" ");
			md.addButton(markdownButtonLabel("本命物信息"), { data: "/本命物信息" });
			message.send(FormatGui({
				isPrivate,
				bid,
				title: result.data.success ? "炼化成功" : "炼化失败",
				content: md
			}));
			return;
		}
		case "SOUL_ARTIFACT_NEED_CONFIRM": {
			const md = Format.createMarkdown();
			md.addText(`⚠️ ${result.data.message}`);
			md.addNewline().addText("尚未炼化 · 确认后替换当前本命物");
			md.addNewline();
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "本命物替换确认",
				content: md,
				footer: [{
					label: "确认炼化",
					command: `/炼化 ${result.data.targetInstanceId} 确认`
				}, {
					label: "返回本命物",
					command: "/本命物信息"
				}]
			}));
			return;
		}
		case "STORAGE_NOT_FOUND": {
			const md = Format.createMarkdown();
			md.addText(result.data.message);
			appendMiddlewareAdvice(md, withBusinessRecovery(operation, {
				title: "",
				heading: "",
				text: result.data.message,
				buttons: [],
				advice: []
			}).advice);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "❌",
				content: md
			}));
			return;
		}
		case "MISSING_PARAM": {
			const md = Format.createMarkdown();
			md.addText("请选择要使用的道具。");
			appendMiddlewareAdvice(md, withBusinessRecovery(operation, {
				title: "",
				heading: "",
				text: "参数错误",
				buttons: [],
				advice: []
			}).advice);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "消耗道具",
				content: md
			}));
			return;
		}
		case "NUMERIC_NOT_ALLOWED": {
			const md = Format.createMarkdown();
			md.addText("请从背包选择道具。");
			appendMiddlewareAdvice(md, withBusinessRecovery(operation, {
				title: "",
				heading: "",
				text: "参数错误",
				buttons: [],
				advice: []
			}).advice);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "消耗道具",
				content: md
			}));
			return;
		}
		case "INVALID_QUANTITY": {
			const md = Format.createMarkdown();
			md.addText("❌ 数量必须是大于0的整数");
			appendMiddlewareAdvice(md, withBusinessRecovery(operation, {
				title: "",
				heading: "",
				text: "参数错误",
				buttons: [],
				advice: []
			}).advice);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "消耗道具",
				content: md
			}));
			return;
		}
		case "FAIL": {
			const md = Format.createMarkdown();
			const recovery = withBusinessRecovery(operation, {
				title: "❌",
				heading: "",
				text: result.data.message,
				buttons: [],
				advice: []
			});
			const displayMsg = recovery.text;
			md.addText(`${displayMsg}`);
			md.addNewline();
			appendMiddlewareAdvice(md, recovery.advice);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "❌",
				content: md,
				footer: recovery.buttons.length ? recovery.buttons : [{
					label: "储物袋",
					command: "/我的储物袋"
				}]
			}));
			return;
		}
		case "PENDING_PEIYUAN": {
			const pending = result.data;
			const md = Format.createMarkdown();
			const qty = pending.quantity;
			if (qty > 1) {
				md.addText(pending.view.headingText);
				md.addNewline();
				md.addNewline();
			}
			if (!pending.view.hasChanges) {
				md.addText("— 所有丹药变化总和均≤0，已全部丢弃，本次属性不会变动");
				md.addNewline();
			} else for (const line of pending.view.changeLines) {
				md.addText(line);
				md.addNewline();
			}
			if (pending.view.showRollDetails) {
				md.addNewline();
				md.addText("📜 各颗明细：");
				md.addNewline();
				for (const line of pending.view.rollLines) {
					md.addText(line);
					md.addNewline();
				}
			}
			md.addNewline();
			md.addText(pending.view.confirmPromptText);
			md.addNewline();
			md.addText("• 确认 → 全部属性变化生效");
			md.addNewline();
			md.addText("• 取消或超时 → 废弃本次效果");
			md.addNewline();
			md.addText(`• ${qty > 1 ? qty + "颗" : ""}培元丹不返还`);
			md.addNewline();
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "消耗道具",
				content: md,
				footer: [{
					label: "✅ 确认",
					command: "/确认培元丹"
				}, {
					label: "❌ 取消",
					command: "/取消培元丹"
				}]
			}));
			return;
		}
		case "PENDING_MINGWU_SELECT": {
			const data = result.data;
			const md = Format.createMarkdown();
			const qty = data.quantity ?? 1;
			md.addText("💊 服用明悟丹");
			md.addNewline();
			md.addNewline();
			md.addText(`请选择要参悟的功法（计划服用 ${qty} 颗）：`);
			md.addNewline();
			md.addNewline();
			const footerButtons = [];
			for (const book of data.books) {
				md.addText(`• ${book.name}  ${book.statusText}`);
				md.addNewline();
				if (book.canSelect) footerButtons.push({
					label: book.name,
					command: `/确认明悟丹 ${book.skillBookId} ${qty}`
				});
			}
			md.addNewline();
			md.addText(`今日剩余：${data.remainingCount}次`);
			md.addNewline();
			md.addText(data.guidanceText);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "消耗道具",
				content: md,
				footer: footerButtons
			}));
			return;
		}
		case "PENDING_MINGWU": {
			const mingwu = result.data;
			const md = Format.createMarkdown();
			md.addText("💊 服用明悟丹");
			md.addNewline();
			if (mingwu.proficiencyGain && mingwu.proficiencyGain > 0) md.addText(`✨ ${mingwu.message}`);
			else if (mingwu.proficiencyGain === 0) md.addText(`😔 ${mingwu.message}`);
			else md.addText(mingwu.message);
			md.addNewline();
			if (mingwu.skillBookName) {
				md.addText(`📖 功法：${mingwu.skillBookName}`);
				md.addNewline();
				md.addText(`当前熟练度：${mingwu.currentProficiency}%`);
				md.addNewline();
			}
			md.addNewline();
			md.addText(`今日剩余：${mingwu.remainingCount}次`);
			md.addNewline();
			md.addText("💡 明悟丹最高可提升至60%，更高需通过比试等战斗途径提升");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "消耗道具",
				content: md
			}));
			return;
		}
		case "OK": {
			const md = Format.createMarkdown();
			md.addText(result.data.message);
			if (result.data.remainingQuantity !== void 0) md.addText(`\n\n剩余数量: ${result.data.remainingQuantity}`);
			md.addNewline();
			if (await sendOnboardingFollowup(e, loaded, "消耗道具", md)) return;
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "消耗道具",
				content: md,
				footer: [{
					label: "查看储物袋",
					command: "/我的储物袋 道具"
				}, {
					label: "查看信息",
					command: "/我的信息"
				}]
			}));
			return;
		}
		case "ERROR":
			logger.error("消耗道具失败:", result.data.message);
			await sendMiddlewareReply(e, withBusinessRecovery(operation, {
				title: "操作未完成",
				heading: "",
				text: "使用结果未获完整确认，请先核对目标、当前状态与原回执。",
				buttons: [],
				advice: []
			}));
	}
});

//#endregion
export { response as default };