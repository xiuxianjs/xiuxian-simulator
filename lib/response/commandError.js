import { getCommandErrorMessage } from "../utils/commandError.js";
import { FormatGui } from "../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../utils/useMessage.js";
import { Format } from "alemonjs";

//#region src/response/commandError.ts
/** App error boundary: reply once, then stop the failed command. */
async function handleCommandError({ event, error }) {
	if (![
		"message.create",
		"private.message.create",
		"interaction.create",
		"private.interaction.create"
	].includes(event.name)) return;
	const [message] = useMessage$1(event);
	const content = Format.createMarkdown();
	content.addText(getCommandErrorMessage(error));
	await message.send(FormatGui({
		bid: event.UserId,
		isPrivate: event.name.startsWith("private."),
		title: "操作未完成",
		content
	}));
}

//#endregion
export { handleCommandError };