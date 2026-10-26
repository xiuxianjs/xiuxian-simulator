import { FormatGui } from "../../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../../utils/useMessage.js";
import { selects } from "../../config.js";
import { Format, onResponse } from "alemonjs";

//#region src/response/flyMail/guildSubscription/res.ts
var res_default = onResponse(selects, async (e) => {
	const [message] = useMessage$1();
	await message.send(FormatGui({
		isPrivate: e.isPrivate,
		bid: e.UserId,
		bar: false,
		content: Format.createMarkdown().addText("飞信已统一私聊投递，无需设置宗门或师门订阅群。私聊不可达时，仅在活跃群提醒查看。")
	}));
});

//#endregion
export { res_default as default };