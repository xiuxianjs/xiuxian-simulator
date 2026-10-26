import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { formatName } from "../../utils/name.js";
import { Format } from "alemonjs";

//#region src/response/start/namePrompt.ts
async function sendRegistrationNamePrompt(event) {
	const [message] = useMessage$1(event);
	const name = formatName(event.UserName);
	const md = Format.createMarkdown();
	md.addText("欢迎踏入修仙世界！");
	md.addNewline();
	md.addText("请输入你的道号，开始修仙之旅。");
	md.addNewline();
	await message.send(FormatGui({
		isPrivate: event.isPrivate ?? false,
		bid: event.UserId,
		title: "踏入仙途",
		content: md,
		bar: [{
			label: `我是 ${name}`,
			command: `/我是 ${name}`
		}]
	}));
}

//#endregion
export { sendRegistrationNamePrompt };