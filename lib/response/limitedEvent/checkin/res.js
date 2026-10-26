import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotLimitedEventCheckin } from "../../../api/bot/limited-event-robot-query.js";
import { EVENT_FOOTER, EVENT_HEADER } from "../nav.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/limitedEvent/checkin/res.ts
/**
* 限时活动 - 签到
* 指令：/活动签到
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const isPrivate = e.isPrivate ?? false;
	const md = Format.createMarkdown();
	const feedback = async (reply) => {
		const body = Format.createMarkdown().addText(reply.text);
		for (const block of reply.blocks ?? []) if (block.quoted) body.addBlockquote(Format.createMarkdown().addText(block.text));
		else body.addText(block.text).addNewline();
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "活动签到",
			header: EVENT_HEADER,
			content: body,
			footer: [[{
				label: "日历",
				command: "/签到日历 活动"
			}], EVENT_FOOTER]
		}));
	};
	let result;
	try {
		const loaded = await runRobotBusiness(e, "checkin.limited-event", {}, parseRobotLimitedEventCheckin, next, feedback);
		if (loaded.handled) return;
		result = loaded.data;
	} catch (error) {
		await feedback({ text: error instanceof Error ? error.message : "活动签到失败，请稍后再试" });
		return;
	}
	md.addText("✅ 活动签到成功！");
	md.addNewline();
	md.addNewline();
	for (const r of result.data.results) md.addBlockquote(createQuoteMarkdown([`🎁 ${r.eventTitle} - ${r.subTitle}（第${r.dayIndex}天）`, `获得：${r.rewardText}`], [{
		label: "日历",
		command: "/签到日历 活动"
	}]));
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "活动签到",
		header: EVENT_HEADER,
		content: md,
		footer: EVENT_FOOTER
	}));
});

//#endregion
export { res_default as default };