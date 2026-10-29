import { formatGameTime } from "../../../utils/gameTime.js";
import { markdownButtonLabel } from "../../../utils/buttonLabel.js";
import { isPrivateEvent } from "../../../utils/privateEvent.js";
import { FormatGui, createQuoteMarkdown } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { parseNotificationHistory } from "../../../api/bot/notification-history-queries.js";
import { flyMailQuote, flyMailViewCommand, parseFlyMailNotice } from "../../../utils/flyMailPresentation.js";
import { notificationTextLayout } from "../../../notification/presentation.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { Format, logger, onResponse, useEvent } from "alemonjs";

//#region src/response/notification/history/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const md = Format.createMarkdown();
	const match = (e.MessageText ?? "").trim().match(/^[!！/#＃]?(?:我的通知|通知记录)(?:\s+(\d+))?$/);
	const page = Number(match?.[1] ?? 1);
	const footer = [{
		label: "返回主页",
		command: "/我"
	}];
	let hasNext = false;
	try {
		const [, parentNext] = useEvent();
		const response = await runRobotBusiness(e, "notifications.history", { pageText: match ? match[1] ?? "" : null }, (data) => parseNotificationHistory(data, page), parentNext, async (reply) => {
			md.addText(reply.text);
			await message.send(FormatGui({
				isPrivate: isPrivateEvent(e),
				bid: e.UserId,
				title: reply.title,
				content: md,
				footer
			}));
		});
		if (response.handled) return;
		const result = response.data;
		hasNext = result.hasNext;
		if (result.items.length === 0) md.addText("本页暂无通知");
		for (const [index, item] of result.items.entries()) {
			if (item.id.startsWith("flymail.subscription.required:")) {
				md.addBlockquote(createQuoteMarkdown(["旧飞信转发提醒已停用，飞信仅向实际收件人私聊投递。"]));
				continue;
			}
			if (!isPrivateEvent(e) && (item.flymail || item.id.startsWith("flymail."))) {
				md.addBlockquote(createQuoteMarkdown(["你有飞信记录，请私聊机器人发送 /飞信 查看。"]));
				continue;
			}
			const mail = parseFlyMailNotice(item.flymail);
			if (mail) {
				const quote = flyMailQuote(mail, e.uid);
				quote.addText(" ").addButton(markdownButtonLabel("查看飞信"), { data: flyMailViewCommand(mail.scope, mail.conversationId) });
				md.addBlockquote(quote);
				continue;
			}
			const { title, lines } = notificationTextLayout(item.text);
			const quote = createQuoteMarkdown([
				`【${index + 1}】${title}`,
				`时间：${formatGameTime(item.time)}`,
				"",
				...lines
			]);
			md.addBlockquote(quote).addNewline();
		}
	} catch (error) {
		logger.error("通知记录查询失败", error);
		md.addText("通知记录暂时无法加载，请稍后再试。");
	}
	await message.send(FormatGui({
		isPrivate: isPrivateEvent(e),
		bid: e.UserId,
		title: "我的通知",
		content: md,
		footer,
		nav: {
			current: page,
			hasNext,
			command: "/我的通知 {page}"
		}
	}));
});

//#endregion
export { res_default as default };