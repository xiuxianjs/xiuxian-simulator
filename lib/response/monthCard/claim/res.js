import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseRobotMonthCardClaim } from "../../../api/bot/membership-claim.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/monthCard/claim/res.ts
/**
* 月卡一键领取
* 领取当前可领取的所有每日奖励
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const renderFailure = async (reply) => {
		const text = reply.text.includes("尚未开通月卡或月卡已过期") ? "月卡未生效。" : reply.text.includes("今日暂无可领取的奖励") ? "今日暂无可领。" : reply.text === "领取失败，请稍后再试或联系运营。" ? "领取结果待确认，请查看月卡奖励。" : reply.text;
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "月卡奖励",
			content: Format.createMarkdown().addBlockquote(createQuoteMarkdown([text], [{
				label: "查看月卡",
				command: "/我的权益 月卡"
			}])),
			header: [{
				label: "返回权益",
				command: "/我的权益"
			}]
		}));
	};
	try {
		const loaded = await runRobotBusiness(e, "membership.claim-month-card", {}, parseRobotMonthCardClaim, next, renderFailure);
		if (loaded.handled) return;
		const { days, rewards, status } = loaded.data;
		const md = Format.createMarkdown();
		md.addBlockquote(createQuoteMarkdown([
			`已领取 ${days} 天奖励`,
			`灵晶 ×${rewards.spiritCrystal}`,
			`精力丹 ×${rewards.huanHunDan} · 元力丹 ×${rewards.yangShenDan}`,
			`累计已发 ${status.claimedCount} 天 · 后续待发 ${status.upcomingCount} 天`,
			...status.prepaidCount > 0 ? [`未解锁的 ${status.prepaidCount} 天奖励已历史发放，不会重复领取`] : []
		], [{
			label: "奖励日历",
			command: "/我的权益 月卡日历"
		}]));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "月卡奖励",
			header: [{
				label: "返回权益",
				command: "/我的权益"
			}],
			content: md
		}));
	} catch (error) {
		logger.error("月卡一键领取失败:", error);
		await renderFailure({ text: "领取失败，请稍后再试或联系运营。" });
	}
});

//#endregion
export { res_default as default };