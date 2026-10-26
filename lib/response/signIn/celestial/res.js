import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseRobotCelestialCheckIn } from "../../../api/bot/signin-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/signIn/celestial/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e.UserId;
	const isPrivate = e.isPrivate ?? false;
	const render = async (displayMsg, ritualText) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			content: Format.createMarkdown().addBlockquote(createQuoteMarkdown([displayMsg, ritualText].filter(Boolean), [{
				label: "时段",
				command: "/签到日历 时段"
			}])),
			footer: [{
				label: "我也要签到",
				command: "/登仙台签到"
			}]
		}));
	};
	try {
		const loaded = await runRobotBusiness(e, "checkin.celestial", {}, parseRobotCelestialCheckIn, next, (reply) => render(reply.text, ""));
		if (loaded.handled) return;
		await render(loaded.data.data.message, loaded.data.data.ritualText ?? "");
	} catch {
		await render("登仙台签到失败，请稍后再试。", "");
	}
});

//#endregion
export { res_default as default };