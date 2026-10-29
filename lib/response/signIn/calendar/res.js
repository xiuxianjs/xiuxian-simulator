import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseCheckInView } from "../../../api/bot/checkin-view.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/signIn/calendar/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const args = e.MessageText.replace(/^\/?签到(?:日历|概览)/, "").trim().split(/\s+/);
	const scope = e.MessageText.includes("签到概览") ? "overview" : {
		日常: "daily",
		日期: "dates",
		累计: "milestones",
		新人: "newcomer",
		活动: "event",
		狂欢: "carnival",
		时段: "celestial"
	}[args[0]] ?? "daily";
	const feedback = (text) => message.send(FormatGui({
		isPrivate: e.isPrivate ?? false,
		bid: e.UserId,
		title: "签到日历",
		content: Format.createMarkdown().addText(text),
		footer: [{
			label: "返回签到",
			command: "/签到概览"
		}]
	}));
	try {
		const loaded = await runRobotBusiness(e, "checkin.view", {
			scope,
			page: /^\d+$/.test(args[1] ?? "") ? Math.min(Number(args[1]), 100) : 0
		}, parseCheckInView, next, async (reply) => {
			await feedback(reply.text);
		});
		if (loaded.handled) return;
		const view = loaded.data;
		const md = Format.createMarkdown();
		for (const block of view.blocks) md.addBlockquote(createQuoteMarkdown(block.text.split("\n"), block.buttons));
		await message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid: e.UserId,
			title: view.title,
			content: md,
			footer: view.buttons
		}));
	} catch {
		await feedback("签到日历暂不可用，请稍后重试；查看日历不会执行签到。");
	}
});

//#endregion
export { res_default as default };