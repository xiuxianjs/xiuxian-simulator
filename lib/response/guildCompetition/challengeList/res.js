import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { section } from "../../presentation/sections.js";
import { parseBackendGuildCompetitionKnockoutCandidates } from "../../../api/bot/competition-knockout-candidates-query.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/guildCompetition/challengeList/res.ts
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
	const loaded = await runRobotBusiness(e, "competition.candidates", {}, parseBackendGuildCompetitionKnockoutCandidates, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : "获取挑战列表失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const { score, remain, list } = { data: {
		score: loaded.data.score,
		remain: loaded.data.remaining,
		list: loaded.data.candidates.map((item) => ({
			guildId: item.guildId,
			guildName: item.guildName,
			memberSlots: item.slots
		}))
	} }.data;
	const md = Format.createMarkdown();
	md.addBlockquote(Format.createMarkdown().addText(`积分：${score} · 挑战次数：${remain}`));
	if (list.length <= 0) {
		md.addText("暂无可挑战宗门");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门大比 · 参与挑战",
			header: [{
				label: "返回",
				command: "/宗门大比"
			}],
			content: md
		}));
		return;
	}
	for (const item of list) {
		const defenderGuildId = item.guildId;
		const defenderGuildName = item.guildName;
		const slots = item.memberSlots;
		if (!slots.some(Boolean)) {
			md.addBlockquote(section({
				title: defenderGuildName,
				lines: ["成员：暂无"],
				actions: [{
					label: "挑战",
					command: `/挑战宗门 ${defenderGuildId}`
				}]
			}));
			continue;
		}
		const memberNames = slots.map((slot, i) => {
			const pos = i + 1;
			if (slot) return `${pos}.${slot.name}`;
			return `${pos}.空`;
		}).join(" ");
		md.addBlockquote(section({
			title: defenderGuildName,
			lines: [`成员：${memberNames}`],
			actions: [{
				label: "挑战",
				command: `/挑战宗门 ${defenderGuildId}`
			}]
		}));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "宗门大比 - 参与挑战",
		header: [{
			label: "返回",
			command: "/宗门大比"
		}],
		content: md
	}));
});

//#endregion
export { res_default as default };