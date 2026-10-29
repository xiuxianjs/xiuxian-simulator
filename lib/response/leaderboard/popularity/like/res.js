import { FormatGui } from "../../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../../utils/useMessage.js";
import { appendMiddlewareAdvice } from "../../../middlewareReply.js";
import { resolveRobotTargetFromArg } from "../../../../utils/targetUid.js";
import { parseRobotPopularityLike } from "../../../../api/bot/popularity-like.js";
import { popularityRecoveryTips, popularitySuccessTips } from "../../../popularityRecovery.js";
import { selects } from "../../../config.js";
import { adviceRenderer } from "../../../feedbackRenderer.js";
import { runRobotBusiness } from "../../../robotBusiness.js";
import { rankingFeedbackMarkdown } from "../../view.js";
import { Format, onResponse, useEvent, useMention } from "alemonjs";

//#region src/response/leaderboard/popularity/like/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const [mention] = useMention();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const match = (e.MessageText ?? "").trim().match(/^(?:!|！|\/|#|＃)?点赞人气\s+(\S+)\s+([A-Za-z]+)$/);
	if (!match) {
		const md = Format.createMarkdown().addText("请从榜单选择要点赞的道友。");
		appendMiddlewareAdvice(md, popularityRecoveryTips("popularity.like", "参数不完整"));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "人气点赞",
			content: md
		}));
		return;
	}
	const [, next] = useEvent();
	let response;
	try {
		const target = await resolveRobotTargetFromArg(match[1], mention);
		response = await runRobotBusiness(e, "popularity.like", {
			target,
			boardType: match[2]
		}, parseRobotPopularityLike, next, adviceRenderer(async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "人气点赞",
				header: [{
					label: "人气榜",
					command: "/人气排行榜"
				}],
				content: rankingFeedbackMarkdown(reply),
				footer: reply.buttons.length ? reply.buttons : void 0
			}));
		}));
	} catch {
		const md = Format.createMarkdown().addText("点赞结果未获完整确认，请先核对当前状态。");
		appendMiddlewareAdvice(md, popularityRecoveryTips("popularity.like", "结果未确认"));
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "人气点赞",
			header: [{
				label: "人气榜",
				command: "/人气排行榜"
			}],
			content: md
		}));
		return;
	}
	if (response.handled) return;
	if (response.data.outcome === "ignored") {
		const md = Format.createMarkdown().addText("未能定位可点赞的道友，请从当前榜单选择目标。");
		appendMiddlewareAdvice(md, popularityRecoveryTips("popularity.like", "未能定位"));
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "人气点赞",
			content: md
		}));
		return;
	}
	const result = { data: {
		...response.data,
		success: true
	} };
	const md = Format.createMarkdown();
	const displayMsg = result.data.message;
	md.addText(displayMsg);
	if (result.data.success) {
		md.addNewline();
		md.addText(`当前人气：${result.data.currentPopularity ?? 0}`).addNewline();
		md.addText(`今日剩余点赞：${result.data.remainingLikes ?? 0}次`);
	}
	appendMiddlewareAdvice(md, popularitySuccessTips(result.data.remainingLikes));
	const header = [{
		label: "人气榜",
		command: "/人气排行榜"
	}];
	const boardLabel = result.data.boardLabel;
	if (boardLabel) header.push({
		label: `${boardLabel} `,
		command: `/${boardLabel}`
	});
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "人气点赞",
		content: md,
		header
	}));
});

//#endregion
export { res_default as default };