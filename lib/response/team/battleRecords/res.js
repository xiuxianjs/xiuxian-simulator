import { FormatGui } from "../../../utils/messageHelper.js";
import { formatGameTime } from "../../../utils/gameTime.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { parseBackendTeamBattleRecords } from "../../../api/bot/queries.js";
import { PAGE_SIZE } from "../../../constants/common.js";
import "../../../constants/index.js";
import { teamRecoveryTips } from "../../teamRecovery.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/team/battleRecords/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [, next] = useEvent();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText ?? "").match(/^(!|！|\/|#|＃)?队伍战斗记录(?:\s+(\d+))?$/);
	const page = match?.[2] ? Number(match[2]) : 1;
	let result;
	try {
		const loaded = await runRobotBusiness(e, "teams.battle-records", {
			page,
			pageSize: 5
		}, (value) => {
			return {
				code: "OK",
				data: parseBackendTeamBattleRecords(value)
			};
		}, next);
		if (loaded.handled) return;
		result = loaded.data;
	} catch (error) {
		logger.error("查询队伍战斗记录失败:", error);
		result = {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "查询失败" }
		};
	}
	if (result.code !== "OK") {
		const md = Format.createMarkdown();
		md.addText(result.data.message);
		appendMiddlewareAdvice(md, teamRecoveryTips("teams.battle-records", result.data.message));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "队伍战斗记录",
			content: md
		}));
		return;
	}
	if (result.data.records.length === 0) {
		const md = Format.createMarkdown();
		const reason = result.data.total > 0 ? "本页暂无队伍战斗记录" : "暂无队伍战斗记录";
		md.addText(reason);
		appendMiddlewareAdvice(md, teamRecoveryTips("teams.battle-records", reason));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "队伍战斗记录",
			content: md
		}));
		return;
	}
	const md = Format.createMarkdown();
	for (const record of result.data.records) {
		md.addText(`【#${record.id}】${record.targetLabel}`);
		md.addNewline();
		md.addBlockquote(Format.createMarkdown().addText(`队伍：${record.teamId}  结果：${record.battleResult === "win" ? "胜利" : record.battleResult === "lose" ? "失败" : "逃跑"}  人数：${record.participantCount}`).addNewline().addText(`时间：${formatGameTime(record.settledAt)}`));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "队伍战斗记录",
		content: md,
		nav: {
			current: result.data.currentPage,
			total: result.data.totalPages,
			count: result.data.total,
			command: "/队伍战斗记录 {page}"
		}
	}));
});

//#endregion
export { res_default as default };