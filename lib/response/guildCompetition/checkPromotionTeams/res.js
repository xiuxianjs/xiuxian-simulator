import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseCompetitionPromotionTeams } from "../../../api/bot/competition-read-projections.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guildCompetition/checkPromotionTeams/res.ts
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
	const loaded = await runRobotBusiness(e, "competition.promotion-teams", {}, parseCompetitionPromotionTeams, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "查询晋级赛队伍失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const teams = loaded.data.teams;
	if (teams.length === 0) {
		const md = Format.createMarkdown();
		md.addText("暂无晋级赛队伍");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md
		}));
		return;
	}
	const md = Format.createMarkdown();
	for (const t of teams) {
		md.addText(`【${Number(t.rank) || "-"}】${String(t.guildName)}`);
		md.addNewline();
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "宗门大比 - 晋级赛队伍",
		header: [{
			label: "返回",
			command: "/宗门大比"
		}],
		content: md
	}));
});

//#endregion
export { res_default as default };