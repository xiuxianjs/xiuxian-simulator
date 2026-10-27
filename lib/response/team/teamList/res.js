import { parseBackendTeams } from "../../../api/bot/queries.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { PAGE_SIZE } from "../../../constants/common.js";
import "../../../constants/index.js";
import { teamRecoveryTips } from "../../teamRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/team/teamList/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText ?? "").match(/^(!|！|\/|#|＃)?队伍列表(?:\s+(\d+))?$/);
	const page = match?.[2] ? Number(match[2]) : 1;
	const footer = [
		{
			label: "我的队伍",
			command: "/我的队伍"
		},
		{
			label: "我的申请",
			command: "/我的队伍申请"
		},
		{
			label: "我的邀请",
			command: "/我的队伍邀请"
		}
	];
	let result;
	try {
		const loaded = await runRobotBusiness(e, "teams.list", {
			page,
			pageSize: 5
		}, (value) => {
			return {
				code: "OK",
				data: parseBackendTeams(value)
			};
		}, next);
		if (loaded.handled) return;
		result = loaded.data;
	} catch (error) {
		logger.error("查询队伍列表失败:", error);
		result = {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询失败" }
		};
	}
	if (result.code !== "OK") {
		const md = Format.createMarkdown();
		md.addText(result.data.message);
		appendMiddlewareAdvice(md, teamRecoveryTips("teams.list", result.data.message));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer
		}));
		return;
	}
	if (result.data.teams.length === 0) {
		const md = Format.createMarkdown();
		const reason = result.data.total > 0 ? "本页暂无队伍" : "暂无队伍";
		md.addText(reason);
		appendMiddlewareAdvice(md, teamRecoveryTips("teams.list", reason));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "",
			content: md,
			footer
		}));
		return;
	}
	const md = Format.createMarkdown();
	for (const team of result.data.teams) md.addBlockquote(createQuoteMarkdown([`【${team.teamId}】${team.leaderName}的队伍`, `人数: ${team.memberCount}/${team.maxMembers}  门槛: ${team.minRealmName ?? "无"}`], [{
		label: "查看",
		command: `/队伍信息 ${team.teamId}`
	}, {
		label: "申请",
		command: `/加入队伍 ${team.teamId}`
	}]));
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "队伍列表",
		content: md,
		nav: {
			current: result.data.currentPage,
			total: result.data.totalPages,
			command: "/队伍列表 {page}"
		},
		footer
	}));
});

//#endregion
export { res_default as default };