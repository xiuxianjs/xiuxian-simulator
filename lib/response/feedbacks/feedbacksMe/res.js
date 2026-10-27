import { formatGameTime } from "../../../utils/gameTime.js";
import { parseBackendFeedbacks } from "../../../api/bot/queries.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parsePageNumber } from "../../../api/bot/feedback-robot.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/feedbacks/feedbacksMe/res.ts
/**
* 我的反馈功能
* 支持分页查询用户的反馈记录
* 指令格式：/我的反馈 [页数]
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const [, next] = useEvent();
	const renderFailure = async (reply) => {
		const content = Format.createMarkdown().addText(reply.text);
		for (const button of reply.buttons) {
			content.addText(" ");
			content.addButton(markdownButtonLabel(button.label), { data: button.command });
		}
		if (reply.buttons.length) content.addNewline();
		await message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: "我的反馈",
			content
		}));
	};
	try {
		const messageText = e.MessageText;
		const page = parsePageNumber(messageText);
		const loaded = await runRobotBusiness(e, "feedback.mine", { page }, parseBackendFeedbacks, next, renderFailure);
		if (loaded.handled) return;
		const result = loaded.data;
		if (result.total === 0) {
			const emptyMd = Format.createMarkdown();
			emptyMd.addText("您还没有提交过任何反馈。");
			message.send(FormatGui({
				isPrivate: e.isPrivate ?? false,
				bid,
				title: "我的反馈",
				content: emptyMd,
				footer: [{
					label: "提交反馈",
					command: "/提交反馈"
				}]
			}));
			return;
		}
		const contentMd = Format.createMarkdown();
		result.feedbacks.forEach((feedback) => {
			const status = feedback.isReplied ? "已回复" : "未回复";
			const content = feedback.content.length > 20 ? feedback.content.substring(0, 20) + "..." : feedback.content;
			const feedbackTime = formatGameTime(feedback.feedbackTime);
			contentMd.addBlockquote(createQuoteMarkdown([
				`【${feedback.id}】【${status}】`,
				content,
				feedbackTime
			], [{
				label: "查看",
				command: `/查看反馈 ${feedback?.id ?? 0}`
			}]));
		});
		message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: "我的反馈",
			content: contentMd,
			nav: {
				current: result.currentPage,
				total: result.totalPages,
				command: "/我的反馈 {page}"
			},
			header: [{
				label: "提交反馈",
				command: "/提交反馈"
			}]
		}));
	} catch (error) {
		logger.error("查询我的反馈失败:", error);
		const errMd = Format.createMarkdown();
		errMd.addText("查询反馈记录失败，请稍后再试。");
		message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid,
			title: "我的反馈",
			content: errMd
		}));
	}
});

//#endregion
export { res_default as default };