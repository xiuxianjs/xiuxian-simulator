import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { teamMatchRecoveryTips } from "../../teamMatchRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendTeamMatchSnapshot } from "../../../api/bot/team-match-queries.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/teamMatch/status/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	if (!/^(!|！|\/|#|＃)?匹配状态$/.test(e.MessageText || "")) return;
	const [, next] = useEvent();
	const renderFailure = async (text, advice = [], buttons = []) => {
		const content = Format.createMarkdown();
		content.addText(text);
		appendMiddlewareAdvice(content, advice);
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "副本匹配",
			content,
			footer: buttons
		}));
	};
	let loaded;
	try {
		loaded = await runRobotBusiness(e, "team-match.snapshot", {}, parseBackendTeamMatchSnapshot, next, adviceRenderer((reply) => renderFailure(reply.text, reply.advice, reply.buttons)));
		if (loaded.handled) return;
	} catch (error) {
		await renderFailure(error instanceof Error ? error.message : "查询匹配状态失败");
		return;
	}
	const md = Format.createMarkdown();
	let footer;
	const data = loaded.data;
	if (data === null) {
		md.addText("当前未查到有效匹配记录");
		appendMiddlewareAdvice(md, teamMatchRecoveryTips("team-match.snapshot", "当前未查到有效匹配记录"));
	} else {
		md.addText("状态：匹配中");
		md.addNewline();
		md.addText(`目标：${data.targetLabel}`);
		md.addNewline();
		md.addText(`已等待：${data.waitedSeconds}秒`);
		md.addNewline();
		md.addText(`当前策略：${{
			WAITING: "等待同目标修士进入匹配池",
			SAME_REALM: "仅匹配同大境界修士",
			ADJACENT_REALM: "优先同大境界，其次相邻大境界",
			NEAREST_REALM: "放宽到同目标副本的最近大境界修士"
		}[data.phase]}`);
		md.addNewline();
		md.addText(`时限：${data.timeoutSeconds}秒`);
		if (data.waitedSeconds >= data.timeoutSeconds) {
			md.addNewline().addText("已达到提示时限，请核对当前队伍与服务端通知");
			appendMiddlewareAdvice(md, teamMatchRecoveryTips("team-match.snapshot", "已达到提示时限"));
		}
		footer = [{
			label: "取消匹配",
			command: "/取消匹配"
		}];
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "副本匹配",
		content: md,
		footer
	}));
});

//#endregion
export { res_default as default };