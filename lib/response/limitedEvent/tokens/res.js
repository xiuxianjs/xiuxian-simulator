import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { runRobotBusiness } from "../../robotBusiness.js";
import { parseBackendEventTokens } from "../../../api/bot/event-tokens-queries.js";
import { EVENT_FOOTER, EVENT_HEADER } from "../nav.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/limitedEvent/tokens/res.ts
/**
* 限时活动 - 道具余额查看
* 指令：/活动道具
*/
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	const bid = e?.UserId;
	const isPrivate = e.isPrivate ?? false;
	const md = Format.createMarkdown();
	const [, parentNext] = useEvent();
	let tokens;
	try {
		const response = await runRobotBusiness(e, "limited-event.tokens", {}, parseBackendEventTokens, parentNext, async (reply) => {
			await message.send(FormatGui({
				isPrivate,
				bid,
				title: "活动道具",
				header: EVENT_HEADER,
				content: Format.createMarkdown().addText(reply.text)
			}));
		});
		if (response.handled) return;
		tokens = response.data;
	} catch {
		md.addText("查看活动道具失败，请稍后再试");
		await message.send(FormatGui({
			isPrivate,
			bid,
			title: "活动道具",
			header: EVENT_HEADER,
			content: md
		}));
		return;
	}
	if (!tokens.length) {
		md.addText("当前没有进行中的限时活动");
		message.send(FormatGui({
			isPrivate,
			bid,
			title: "活动道具",
			header: EVENT_HEADER,
			content: md
		}));
		return;
	}
	md.addText("🎒 活动道具余额");
	md.addNewline();
	md.addNewline();
	for (const t of tokens) {
		md.addText(`📌 ${t.eventTitle}`);
		md.addNewline();
		md.addBlockquote(Format.createMarkdown().addText(`${t.paidTokenName}：${t.paidToken}`).addNewline().addText(`${t.freeTokenName}（任务获得）：${t.freeToken}`));
	}
	message.send(FormatGui({
		isPrivate,
		bid,
		title: "活动道具",
		header: EVENT_HEADER,
		content: md,
		footer: EVENT_FOOTER
	}));
});

//#endregion
export { res_default as default };