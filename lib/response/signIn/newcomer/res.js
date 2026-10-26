import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotNewcomerCheckIn } from "../../../api/bot/signin-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/signIn/newcomer/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const render = async (displayMsg, ritualText) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "签到",
			header: [
				{
					label: "日常",
					command: "/日常签到"
				},
				{
					label: "新人",
					command: "/新人签到"
				},
				{
					label: "登仙台",
					command: "/登仙台签到"
				},
				{
					label: "宗门",
					command: "/宗门签到"
				}
			],
			content: Format.createMarkdown().addBlockquote(createQuoteMarkdown([displayMsg, ritualText].filter(Boolean), [{
				label: "日历",
				command: "/签到日历 新人"
			}]))
		}));
	};
	try {
		const loaded = await runRobotBusiness(e, "checkin.newcomer", {}, parseRobotNewcomerCheckIn, next, (reply) => render(reply.text, reply.quote ?? ""));
		if (loaded.handled) return;
		await render(loaded.data.data.message, loaded.data.data.ritualText ?? "");
	} catch {
		await render("新人签到失败，请稍后再试。", "");
	}
});

//#endregion
export { res_default as default };