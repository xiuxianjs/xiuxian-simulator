import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { competitionMemberAddArguments, parseRobotCompetitionMemberAdd } from "../../../api/bot/competition-member-add-robot-query.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/guildCompetition/addMember/res.ts
const formatBattleSummary = (power) => {
	return `战力✊${power}`;
};
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const [, next] = useEvent();
	const args = await competitionMemberAddArguments(e.MessageText ?? "", mention);
	const sendFailure = async (text) => {
		const md = Format.createMarkdown();
		md.addText(text);
		if (args.mode === "direct") md.addNewline();
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门大比",
			header: [{
				label: "返回",
				command: "/宗门大比"
			}],
			content: md,
			...args.mode === "direct" ? { footer: [{
				label: "宗门大比",
				command: "/宗门大比"
			}] } : {}
		}));
	};
	const loaded = await runRobotBusiness(e, "competition.member-add", args, parseRobotCompetitionMemberAdd, next, async (reply) => {
		await sendFailure(reply.text);
	}).catch(async (error) => {
		await sendFailure(error instanceof Error ? error.message : args.mode === "direct" ? "添加失败" : args.mode === "positions" ? "获取位置信息失败" : "获取成员列表失败");
		return { handled: true };
	});
	if (loaded.handled) return;
	const result = loaded.data;
	if (result.outcome === "no_target") return;
	if (result.outcome === "result") {
		const md = Format.createMarkdown();
		md.addText(result.receipt.message);
		md.addNewline();
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门大比",
			header: [{
				label: "返回",
				command: "/宗门大比"
			}],
			content: md,
			footer: [{
				label: "宗门大比",
				command: "/宗门大比"
			}]
		}));
		return;
	}
	if (result.outcome === "list") {
		const { members, page, totalPages, count } = result.data;
		const md = Format.createMarkdown();
		for (const m of members) md.addBlockquote(createQuoteMarkdown([`【${m.userId}】${m.name}`, formatBattleSummary(m.power)], [{
			label: "选择",
			command: `/添加宗门大比成员 ${m.userId}`
		}, {
			label: "查看面板",
			command: `/查看信息 ${m.userId}`
		}]));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门大比 - 添加成员",
			header: [{
				label: "返回",
				command: "/宗门大比"
			}],
			content: md,
			nav: totalPages > 1 ? {
				current: page,
				total: totalPages,
				count,
				command: "/添加宗门大比成员 p{page}"
			} : void 0
		}));
		return;
	}
	if (result.outcome === "positions") {
		const targetUid = result.targetUid;
		const { availablePositions } = result;
		const md = Format.createMarkdown();
		md.addText("请选择要添加到的位置：");
		const footer = [];
		md.addNewline();
		for (const pos of availablePositions) footer.push({
			label: `位置${pos}`,
			command: `/添加宗门大比成员 ${targetUid} ${pos}`
		});
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门大比 - 选择位置",
			header: [{
				label: "返回",
				command: "/宗门大比"
			}],
			content: md,
			footer
		}));
		return;
	}
	{
		const md = Format.createMarkdown();
		md.addText("指令格式：/添加宗门大比成员 [弟子UID/@目标] [位置(1-6)]");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "宗门大比",
			header: [{
				label: "返回",
				command: "/宗门大比"
			}],
			content: md
		}));
	}
});

//#endregion
export { res_default as default };