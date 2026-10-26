import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { teamMatchRecoveryTips } from "../../teamMatchRecovery.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendTeamMatchCancel } from "../../../api/bot/team-match-cancel.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/teamMatch/cancel/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	if (!/^(!|！|\/|#|＃)?取消匹配$/.test(e.MessageText || "")) return;
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
		loaded = await runRobotBusiness(e, "team-match.cancel", {}, parseBackendTeamMatchCancel, next, adviceRenderer((reply) => renderFailure(reply.text, reply.advice, reply.buttons)));
		if (loaded.handled) return;
	} catch (error) {
		await renderFailure(error instanceof Error ? error.message : "取消匹配失败");
		return;
	}
	const md = Format.createMarkdown();
	const text = loaded.data.cancelled ? `已取消匹配：${loaded.data.targetLabel}` : "本次未取消有效匹配记录";
	md.addText(text);
	appendMiddlewareAdvice(md, teamMatchRecoveryTips("team-match.cancel", text));
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "副本匹配",
		content: md
	}));
});

//#endregion
export { res_default as default };