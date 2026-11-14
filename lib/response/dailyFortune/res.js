import { commandText } from "../../utils/commandPrefix.js";
import { markdownButtonLabel } from "../../utils/buttonLabel.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { getCommandErrorMessage } from "../../utils/commandError.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { configureDailyFortune, dailyFortuneTarget, parseDailyFortune } from "../../api/bot/daily-fortune.js";
import { selects } from "../config.js";
import { trackFeatureOutcome } from "../mwFeatureTrack.js";
import { runRobotBusiness } from "../robotBusiness.js";
import { dailyFortuneContent } from "./view.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/dailyFortune/res.ts
var res_default = onResponse(selects, async (event) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const sendText = async (text, canDraw = false) => {
		const quote = Format.createMarkdown().addText(text);
		if (canDraw) quote.addNewline().addButton(markdownButtonLabel("抽取今日机缘"), { data: commandText("每日机缘") });
		await message.send(FormatGui({
			bid: event.UserId,
			isPrivate: event.isPrivate ?? false,
			title: "每日机缘",
			content: Format.createMarkdown().addBlockquote(quote)
		}));
	};
	const text = (event.MessageText ?? "").trim().replace(/^[/#＃]/, "");
	const configuration = text === "开启每日机缘" || text === "关闭每日机缘";
	const startedAt = performance.now();
	let configured = false;
	try {
		if (configuration) {
			const enabled = text === "开启每日机缘";
			await configureDailyFortune(event, enabled);
			configured = true;
			await sendText(enabled ? "本群已开启每日机缘。每个游戏角色每天可主动抽取一次，多个群共享领取次数，每日北京时间零点重置。" : "本群已关闭每日机缘。", enabled);
			return;
		}
		const target = dailyFortuneTarget(event);
		const loaded = await runRobotBusiness(event, "daily-fortune.claim", { target }, parseDailyFortune, next, (reply) => sendText(reply.text));
		if (loaded.handled) return;
		await message.send(FormatGui({
			bid: event.UserId,
			isPrivate: false,
			title: `每日机缘 · ${loaded.data.tier}`,
			content: dailyFortuneContent(loaded.data)
		}));
	} catch (error) {
		await sendText(getCommandErrorMessage(error));
	} finally {
		if (configuration) trackFeatureOutcome(event, configured, startedAt);
	}
});

//#endregion
export { res_default as default };