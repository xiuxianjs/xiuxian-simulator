import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { competitionBetArguments, parseRobotCompetitionBet } from "../../../api/bot/competition-bets-robot-query.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guildCompetition/bet/res.ts
const BET_AMOUNTS = [
	1e3,
	5e3,
	1e4,
	5e4,
	1e5
];
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const send = async (text) => {
		const md = Format.createMarkdown();
		md.addText(text);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门大比 - 押注",
			header: [{
				label: "返回",
				command: "/宗门大比"
			}, {
				label: "押注记录",
				command: "/查看押注记录"
			}],
			content: md
		}));
	};
	const loaded = await runRobotBusiness(e, "competition.bet", competitionBetArguments(e.MessageText ?? "", false), parseRobotCompetitionBet, next, async (reply) => {
		await send(reply.text);
	}).catch(async (error) => {
		await send(error instanceof Error ? error.message : "押注失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const cleaned = (e.MessageText ?? "").trim().replace(/^(!|！|\/|#|＃)?\s*/, "");
	if (loaded.data.outcome === "choices") {
		const guildId = Number(cleaned.match(/^押注宗门大比\s+(\d+)$/)?.[1]);
		const md = Format.createMarkdown();
		md.addText(`请选择押注金额（宗门ID：${guildId}）`);
		md.addNewline();
		const amountButtons = BET_AMOUNTS.map((amount) => ({
			label: `${amount}`,
			command: `/押注宗门大比 ${guildId} ${amount}`
		}));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门大比 - 押注",
			header: [{
				label: "返回",
				command: "/宗门大比"
			}, {
				label: "押注记录",
				command: "/查看押注记录"
			}],
			content: md,
			footer: [amountButtons]
		}));
		return;
	}
	if (loaded.data.outcome === "usage") {
		const md = Format.createMarkdown();
		md.addText("指令格式：/押注宗门大比 [宗门ID] [灵石数量]");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	if (loaded.data.outcome === "result") await send(loaded.data.message);
});

//#endregion
export { res_default as default };