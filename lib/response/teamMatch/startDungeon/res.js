import { parseBackendTeamMatchStart } from "../../../api/bot/team-match-start.js";
import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../middlewareReply.js";
import { selects } from "../../config.js";
import { adviceRenderer } from "../../feedbackRenderer.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/teamMatch/startDungeon/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText ?? "").trim().match(/^(!|！|\/|#|＃)?匹配秘境(?:\s+([\s\S]*))?$/);
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
		loaded = await runRobotBusiness(e, "team-match.start-dungeon", { input: String(match?.[2] ?? "").trim() }, parseBackendTeamMatchStart, next, adviceRenderer((reply) => renderFailure(reply.text, reply.advice, reply.buttons)));
		if (loaded.handled) return;
	} catch (error) {
		await renderFailure(error instanceof Error ? error.message : "发起匹配失败");
		return;
	}
	const md = Format.createMarkdown();
	md.addText("已进入匹配");
	md.addNewline();
	md.addText(`目标：${loaded.data.targetLabel}`);
	md.addNewline();
	md.addText("匹配时限：3分钟");
	md.addNewline();
	md.addText("当前优先匹配同大境界修士");
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "副本匹配",
		content: md,
		footer: [{
			label: "匹配状态",
			command: "/匹配状态"
		}, {
			label: "取消匹配",
			command: "/取消匹配"
		}]
	}));
});

//#endregion
export { res_default as default };