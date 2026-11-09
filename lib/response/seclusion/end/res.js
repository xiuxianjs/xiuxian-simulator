import { FormatGui } from "../../../utils/messageHelper.js";
import { section } from "../../presentation/sections.js";
import { createBackendRequestContext } from "../../../api/bot/context.js";
import { getCommandErrorMessage } from "../../../utils/commandError.js";
import { parseBackendRealmAccess } from "../../../api/bot/realm-access-queries.js";
import "../../presentation/index.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendTreasureEffects } from "../../treasureEffects.js";
import { parseSeclusionEnd } from "../../../api/bot/seclusion-end.js";
import { selects } from "../../config.js";
import { loadFinalBusiness } from "../../finalBusiness.js";
import { dungeonExperienceBonusLines } from "../../dungeon/experienceBonus.js";
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
		const soulNavigation = resolved.access.canUseSoulPath ? [{
			label: "元婴道途",
			command: "/元婴道途"
		}] : [];
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
			md.addBlockquote(section({ lines: [
				view.introText,
				result.refundedSpirit === void 0 ? "状态：精力已退还" : `精力退回：${result.refundedSpirit}`,
				"收益：本次探索无收获"
			] }));
			appendTreasureEffects(md, result.treasureEffects);
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
		const lines = [
			view.introText,
			...view.penaltyText ? [view.penaltyText] : [],
			result.normalExperienceGained !== void 0 ? `获得修为：${result.normalExperienceGained}` : result.creditedExperience === void 0 ? "修为：已结算" : `修为入账：${result.creditedExperience}`,
			...dungeonExperienceBonusLines(view.expBonusText),
			`灵石：+${rewards.spiritStone}`,
			...result.refundedSpirit ? [`精力退回：${result.refundedSpirit}`] : [],
			...view.showHuanHunDan ? [`精力丹：×${rewards.huanHunDan}`] : [],
			...view.showYangShenDan ? [`元力丹：×${rewards.yangShenDan}`] : [],
			...view.showRareDrops ? rewards.rareDrops.map((drop) => `掉落：${drop.name} ×${drop.quantity}`) : []
		];
		md.addBlockquote(section({ lines }));
		appendTreasureEffects(md, result.treasureEffects);
		if (result.materialProgressPercent !== void 0) md.addNewline().addText(`采集积累：${result.materialProgressPercent.toFixed(1)}%`);
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