import { createBackendRequestContext } from "../../../api/bot/context.js";
import { getCommandErrorMessage } from "../../../utils/commandError.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { loadFinalBusiness } from "../../finalBusiness.js";
import { parseBackendRealmAccess } from "../../../api/bot/realm-access-queries.js";
import { parseSeclusionEnd } from "../../../api/bot/seclusion-end.js";
import App from "../../../response-apps/seclusion/end/app.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/seclusion/end/res.ts
/**
* 返程指令处理器
* 指令：/返程
*
* 结束探索秘境并结算奖励
* - 不足1小时：退还精力，无奖励
* - 满1小时：按完整探索小时结算，无提前返程折损
* - 未使用精力由服务端退还，回执包含实际退还量
*/
var res_default = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	try {
		const business = await loadFinalBusiness(e, next, "seclusion.end", {}, (value) => ({
			result: parseSeclusionEnd(value.result),
			access: parseBackendRealmAccess(value.access)
		}));
		if (business.handled) return;
		const resolved = await business.load();
		const soulNavigation = [...resolved.access.canUseSoulPath ? [{
			label: "元婴道途",
			command: "/元婴道途"
		}] : [], {
			label: "我的主页",
			command: "/我"
		}];
		const uid = e.uid;
		const appResult = await App({
			load: () => Promise.resolve(resolved.result),
			bid,
			uid,
			request: createBackendRequestContext(e)
		});
		if (appResult.code !== "OK") {
			const md = Format.createMarkdown();
			md.addText(appResult.data.message);
			message.send(FormatGui({
				isPrivate,
				bid,
				title: "返程",
				content: md
			}));
			return;
		}
		const result = appResult.data;
		const explorationText = (text) => text.replaceAll("出关", "返程").replaceAll("闭关", "探索");
		const view = {
			...result.view,
			title: explorationText(result.view.title),
			introText: explorationText(result.view.introText),
			penaltyText: result.view.penaltyText.includes("基础收益") ? explorationText(result.view.penaltyText) : explorationText(result.view.penaltyText).replaceAll("收益", "基础收益")
		};
		const md = Format.createMarkdown();
		if (view.kind === "refunded") {
			md.addText(view.introText);
			md.addNewline();
			md.addText(result.refundedSpirit === void 0 ? "💫 精力已退还" : `💫 精力退回 ${result.refundedSpirit}`);
			md.addNewline();
			md.addText("此次探索秘境无任何收获。");
			if (result.presenceText) {
				md.addNewline();
				md.addBlockquote(Format.createMarkdown().addText(result.presenceText));
			}
			message.send(FormatGui({
				isPrivate,
				bid,
				title: view.title,
				content: md,
				footer: [{
					label: "再次探索秘境",
					command: "/探索秘境"
				}, ...soulNavigation]
			}));
			return;
		}
		const rewards = result.rewards;
		md.addText(view.introText);
		if (view.penaltyText) {
			md.addNewline();
			md.addText(view.penaltyText);
		}
		md.addNewline();
		md.addNewline();
		md.addText("📦 此行收获：").addNewline();
		md.addText(result.creditedExperience === void 0 ? "修为已结算" : `修为入账：${result.creditedExperience}`).addNewline();
		md.addText(`  灵石 +${rewards.spiritStone}`);
		if (result.refundedSpirit) md.addNewline().addText(`精力退回 ${result.refundedSpirit}`);
		if (view.showHuanHunDan) {
			md.addNewline();
			md.addText(`  精力丹 ×${rewards.huanHunDan}`);
		}
		if (view.showYangShenDan) {
			md.addNewline();
			md.addText(`  元力丹 ×${rewards.yangShenDan}`);
		}
		if (view.showRareDrops) {
			md.addNewline();
			md.addNewline();
			md.addText("🎒 此行寻获：");
			for (const drop of rewards.rareDrops) {
				md.addNewline();
				md.addText(`  ${drop.name} ×${drop.quantity}`);
			}
		}
		if (result.materialProgressPercent !== void 0) md.addNewline().addText(`🌿 采集积累 ${result.materialProgressPercent.toFixed(1)}%`);
		if (result.presenceText) {
			md.addNewline();
			md.addNewline();
			md.addBlockquote(Format.createMarkdown().addText(result.presenceText));
		}
		message.send(FormatGui({
			isPrivate,
			bid,
			title: view.title,
			content: md,
			footer: [{
				label: "再次探索秘境",
				command: "/探索秘境"
			}, ...soulNavigation]
		}));
	} catch (error) {
		const md = Format.createMarkdown();
		md.addText(getCommandErrorMessage(error));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "返程",
			content: md
		}));
	}
});

//#endregion
export { res_default as default };