import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { competitionBetArguments, parseRobotCompetitionBet } from "../../../api/bot/competition-bets-robot-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guildCompetition/followBet/res.ts
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
			title: "宗门大比 - 追投",
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
	const loaded = await runRobotBusiness(e, "competition.follow-bet", competitionBetArguments(e.MessageText ?? "", true), parseRobotCompetitionBet, next, async (reply) => {
		await send(reply.text);
	}).catch(async (error) => {
		await send(error instanceof Error ? error.message : "追投失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	if (loaded.data.outcome === "choices") {
		const md = Format.createMarkdown();
		md.addText("请选择追投金额");
		md.addNewline();
		const amountButtons = BET_AMOUNTS.map((amount) => ({
			label: `${amount}`,
			command: `/追投宗门大比 ${amount}`
		}));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门大比 - 追投",
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
		md.addText("指令格式：/追投宗门大比 [灵石数量]");
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