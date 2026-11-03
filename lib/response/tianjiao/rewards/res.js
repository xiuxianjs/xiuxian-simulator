import { FormatGui } from "../../../utils/messageHelper.js";
import { formatGameTime } from "../../../utils/gameTime.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotTianjiaoRewards } from "../../../api/bot/tianjiao-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/tianjiao/rewards/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	let result;
	try {
		const loaded = await runRobotBusiness(e, "tianjiao.rewards", {}, parseRobotTianjiaoRewards, next);
		if (loaded.handled) return;
		result = loaded.data;
	} catch (error) {
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(error instanceof Error ? error.message : "登天梯查询失败")
		}));
		return;
	}
	const md = Format.createMarkdown();
	if (result.code === "LOCKED") {
		md.addText(result.message);
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer: [{
				label: "我的活动",
				command: "/我的活动"
			}]
		}));
		return;
	}
	md.addText(`🎁 ${result.data.stageName}登天奖励`);
	md.addNewline();
	md.addNewline();
	md.addBold("当前大境界 1-10 名奖励");
	md.addNewline();
	for (const tier of result.data.tiers) {
		const claimedText = tier.claimedAt ? ` · 已于 ${formatGameTime(tier.claimedAt)} 领取` : "";
		md.addText(`第${tier.rank}名：${tier.rewardText}${claimedText}`);
		md.addNewline();
	}
	md.addNewline();
	md.addBold("我的领取记录");
	md.addNewline();
	if (result.data.records.length === 0) {
		md.addText("暂无领取记录");
		md.addNewline();
	} else {
		result.data.records.forEach((record) => {
			md.addText(`${record.stageName} 第${record.rank}名：${record.rewardText} · ${formatGameTime(record.claimedAt)}`);
			md.addNewline();
		});
		if (result.data.recordTotal > result.data.records.length) {
			md.addText(`仅展示最近20条，共 ${result.data.recordTotal} 条记录`);
			md.addNewline();
		}
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "",
		content: md,
		footer: [
			{
				label: "登天梯",
				command: "/登天梯"
			},
			{
				label: "我的活动",
				command: "/我的活动"
			},
			{
				label: "排行榜",
				command: "/排行榜"
			}
		]
	}));
});

//#endregion
export { res_default as default };