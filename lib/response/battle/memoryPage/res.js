import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { battleMemoryPage } from "../../../utils/battleMemoryMessage.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/battle/memoryPage/res.ts
var res_default = onResponse(selects, async (e) => {
	const [, next] = useEvent();
	const text = (e.MessageText ?? "").trim();
	if (!/^[/#＃!！]?战斗回忆翻页(?:\s|$)/i.test(text)) {
		next();
		return;
	}
	const [message] = useMessage$1();
	const match = text.match(/^[/#＃!！]?战斗回忆翻页\s+([\da-f-]+)\s+(\d+)$/i);
	const page = match ? battleMemoryPage(match[1], Number(match[2]), e.UserId) : void 0;
	await message.send(page ?? FormatGui({
		isPrivate: e.isPrivate,
		bid: e.UserId,
		title: "战斗回忆",
		content: Format.createMarkdown().addText("此分页已失效或不可访问，请从原战报的回忆链接查看。"),
		bar: false
	}));
});

//#endregion
export { res_default as default };