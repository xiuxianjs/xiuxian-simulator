import { getAppConfig } from "../../utils/appConfig.js";
import { getCommandPrefix, hasCommandPrefix } from "../../utils/commandPrefix.js";
import { getBackendConfig } from "../../api/bot/config.js";
import { customerSupportCommand } from "../../api/bot/customer-support.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import { Format, onResponse, useEvent } from "alemonjs";

//#region src/response/customerSupport/plain.ts
const supportPlain = onResponse(["private.message.create"], async (event) => {
	const [, next] = useEvent();
	const content = event.MessageText ?? "";
	if (!content.trim() || hasCommandPrefix(content, getCommandPrefix(), false) || !getBackendConfig().channelMode || !getAppConfig().support_api_origin) {
		next();
		return;
	}
	try {
		const result = await customerSupportCommand(event, {
			action: "message",
			content
		});
		if (!result.handled) {
			next();
			return;
		}
		if (result.notice) {
			const [message] = useMessage$1();
			await message.send({ format: Format.create().addText(result.notice) });
		}
	} catch {
		next();
	}
});
var plain_default = Object.assign(supportPlain, { customerSupportPlain: true });

//#endregion
export { plain_default as default };