import { createBackendRequestContext } from "../../../api/bot/context.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { withBusinessRecovery } from "../../businessRecovery.js";
import { selects } from "../../config.js";
import { loadFinalBusiness } from "../../finalBusiness.js";
import { parsePromotionCommand } from "../../../api/bot/promotion-command.js";
import { renderTribulationPanel } from "../../tribulation/render.js";
import App from "../../../response-apps/promotion/perform/app.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/promotion/perform/res.ts
/**
* 晋级指令
* 执行大境界晋级操作
*/
var res_default = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	try {
		const business = await loadFinalBusiness(e, next, "realm.promotion", {}, parsePromotionCommand);
		if (business.handled) return;
		const uid = e.uid;
		const result = await App({
			load: business.load,
			uid,
			bid,
			request: createBackendRequestContext(e)
		});
		if (result.code === "TRIBULATION") {
			await message.send(renderTribulationPanel(result.data, {
				isPrivate,
				bid
			}));
			return;
		}
		if (result.code === "CAP_REACHED") {
			const md = Format.createMarkdown();
			md.addText(`当前最高开放境界为「${result.data.realmName}」`);
			md.addNewline();
			md.addText("更高境界尚未开放，请等待后续更新。");
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "无法晋级",
				content: md
			}));
			return;
		}
		if (result.code === "SUCCESS") {
			const md = Format.createMarkdown();
			md.addText("晋级成功！");
			md.addNewline();
			md.addText(result.data.message);
			md.addNewline();
			if (result.data.tribulation && result.data.tribulation.totalLayers > 0) {
				md.addNewline();
				md.addText(`渡劫：${result.data.tribulation.name}`);
				md.addNewline();
				md.addText(`通过 ${result.data.tribulation.passedLayers}/${result.data.tribulation.totalLayers} 层`);
				md.addNewline();
			}
			if (result.data.newRealm) {
				md.addNewline();
				md.addText("=== 新境界属性 ===");
				md.addNewline();
				md.addText(`境界名称：${result.data.newRealm.name}`);
				md.addNewline();
				md.addText(`灵力：${result.data.newRealm.spiritualPower}`);
				md.addNewline();
				md.addText(`速度：${result.data.newRealm.speed}`);
				md.addNewline();
				md.addText(`法术攻击：${result.data.newRealm.magicAttack}`);
				md.addNewline();
				md.addText(`物理攻击：${result.data.newRealm.physicalAttack}`);
				md.addNewline();
				md.addText(`法术防御：${result.data.newRealm.magicDefense}`);
				md.addNewline();
				md.addText(`物理防御：${result.data.newRealm.physicalDefense}`);
				md.addNewline();
				md.addText(`修为上限：${result.data.newRealm.experienceLimit}`);
				md.addNewline();
			}
			if (result.data.unlockedRecipes.length > 0) {
				md.addNewline();
				md.addText(`🎉 丹方领悟：${result.data.unlockedRecipes.map((n) => `「${n}」`).join("、")}`);
				md.addNewline();
			}
			if ((result.data.masterStageMessages?.length ?? 0) > 0) {
				md.addNewline();
				md.addText("师门反馈：");
				md.addNewline();
				result.data.masterStageMessages?.forEach((line) => {
					md.addBlockquote(Format.createMarkdown().addText(line));
				});
			}
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: [{
					label: "我的境界",
					command: "/我的境界"
				}]
			}));
			return;
		}
		if (result.code === "FAILED") {
			const md = Format.createMarkdown();
			const failMsg = result.data.message;
			md.addText("晋级失败");
			md.addNewline();
			md.addText(failMsg);
			md.addNewline();
			if (result.data.requirementLines.length > 0) {
				md.addBlockquote(createQuoteMarkdown(result.data.requirementLines));
				md.addNewline();
			}
			if (result.data.tribulation && result.data.tribulation.totalLayers > 0) {
				md.addNewline();
				md.addText(`渡劫：${result.data.tribulation.name}`);
				md.addNewline();
				md.addText(result.data.tribulation.summary);
				md.addNewline();
			}
			appendMiddlewareAdvice(md, withBusinessRecovery("realm.promotion", {
				title: "",
				heading: "",
				text: failMsg,
				buttons: [],
				advice: []
			}).advice);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "",
				content: md,
				footer: [{
					label: "我的境界",
					command: "/我的境界"
				}]
			}));
			return;
		}
		const md = Format.createMarkdown();
		md.addText("晋级过程中发生未知错误，请稍后再试或联系运营。");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
	} catch (error) {
		logger.error("晋级失败:", error);
		const md = Format.createMarkdown();
		md.addText("晋级过程中发生未知错误，请稍后再试或联系运营。");
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