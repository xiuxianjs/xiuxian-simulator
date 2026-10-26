import { createBackendRequestContext } from "../../api/bot/context.js";
import { FormatGui } from "../../utils/messageHelper.js";
import { useMessage as useMessage$1 } from "../../utils/useMessage.js";
import "../../api/index.js";
import { selects } from "../config.js";
import { requirePrivateAccountMessage } from "../../utils/privateAccountMessage.js";
import App from "../../response-apps/emailSecurity/switchUid/app.js";
import { Format, logger, onResponse } from "alemonjs";

//#region src/response/emailSecurity/switchUid.ts
var switchUid_default = onResponse(selects, async (e) => {
	if (!await requirePrivateAccountMessage(e)) return;
	const [message] = useMessage$1();
	const sendText = (text) => {
		const md = Format.createMarkdown();
		md.addText(text);
		message.send(FormatGui({
			isPrivate: e.isPrivate ?? false,
			bid: e.UserId,
			title: "切换UID",
			content: md
		}));
	};
	try {
		const result = await App({
			bid: e.UserId,
			messageText: e.MessageText,
			request: createBackendRequestContext(e)
		});
		if (result.code === "FAIL") {
			sendText(result.data.message);
			return;
		}
		const cacheText = result.data.cacheCleared ? "缓存已刷新。" : "角色已切换，缓存将在下次请求时刷新。";
		sendText(`已交换角色绑定：\n当前账号 ${result.data.fromUid}【${result.data.fromName}】→ ${result.data.toUid}【${result.data.toName}】\n${cacheText}`);
	} catch (error) {
		logger.error("切换UID指令处理失败:", error);
		sendText("系统错误，请稍后再试或联系运营");
	}
});

//#endregion
export { switchUid_default as default };