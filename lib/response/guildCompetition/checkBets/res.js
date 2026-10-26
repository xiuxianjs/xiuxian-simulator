import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseCompetitionBets } from "../../../api/bot/competition-bets-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guildCompetition/checkBets/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const sendFailure = async (text) => {
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: Format.createMarkdown().addText(text)
		}));
	};
	const loaded = await runRobotBusiness(e, "competition.bets", {}, parseCompetitionBets, next, async () => {
		await sendFailure("暂无押注记录");
	}).catch(async () => {
		await sendFailure("暂无押注记录");
		return { handled: true };
	});
	if (loaded.handled) return;
	const bets = loaded.data.bets;
	if (!bets || bets.length === 0) {
		const md = Format.createMarkdown();
		md.addText("暂无押注记录");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	const md = Format.createMarkdown();
	const betStatusName = (s) => {
		switch (Number(s)) {
			case 0: return "未结算";
			case 1: return "✅已中奖";
			case 2: return "❌未中奖";
			default: return `未知(${Number(s)})`;
		}
	};
	for (const b of bets) {
		md.addText(`宗门ID:${Number(b.guildId)} | 押注:${Number(b.betAmount)} | 赔率:${Number(b.odds).toFixed(2)}`);
		md.addNewline();
		md.addBlockquote(Format.createMarkdown().addText(`状态：${betStatusName(Number(b.status))}`));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "宗门大比 - 押注记录",
		header: [{
			label: "返回",
			command: "/宗门大比"
		}],
		content: md
	}));
});

//#endregion
export { res_default as default };