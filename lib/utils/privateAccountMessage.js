import { FormatGui } from "./messageHelper.js";
import { useMessage as useMessage$1 } from "./useMessage.js";
import { Format } from "alemonjs";

//#region src/utils/privateAccountMessage.ts
/** Reject public account commands before reading account data or calling APIs. */
async function requirePrivateAccountMessage(event) {
	if (event.isPrivate === true) return true;
	const [message] = useMessage$1();
	const md = Format.createMarkdown();
	md.addText("安全中心及账号安全操作仅限私聊，请私聊机器人发送指令。");
	await message.send(FormatGui({
		isPrivate: false,
		bid: event.UserId,
		title: "账号安全",
		content: md,
		bar: false
	}));
	return false;
}

//#endregion
export { requirePrivateAccountMessage };