import { getCommandErrorMessage } from "../../../utils/commandError.js";
import { startBackendMeditation } from "../../../api/bot/meditation.js";
import "../../../api/index.js";
import { logger } from "alemonjs";

//#region src/response-apps/meditation/start/app.ts
async function App(params) {
	try {
		if (!params.bid) throw new Error("闭关请求缺少平台身份");
		return {
			code: "OK",
			data: params.load ? await params.load() : await startBackendMeditation(params.bid, params.uid, params.request, params.messageText)
		};
	} catch (error) {
		logger.error("[闭关] 错误:", {
			requestId: params.request?.requestId,
			error
		});
		return {
			code: "LOAD_FAILED",
			data: { message: getCommandErrorMessage(error) }
		};
	}
}

//#endregion
export { App as default };