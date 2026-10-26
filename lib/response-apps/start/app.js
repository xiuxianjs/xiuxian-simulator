import { BackendAPIError } from "../../api/bot/client.js";
import { getBackendRobotIdentity } from "../../api/bot/identity.js";
import { registerBackendPlayer } from "../../api/bot/registration.js";
import { logger } from "alemonjs";

//#region src/response-apps/start/app.ts
async function App(params) {
	try {
		if ((await getBackendRobotIdentity(params.bid, params.request)).account.status === "registered") return { code: "EXISTING_USER" };
		const playerName = (params.messageText ?? "").match(/我是\s+(.+)\s*$/)?.[1]?.trim();
		if (!playerName) return { code: "NEED_NAME" };
		return {
			code: "OK",
			data: { playerName: (await registerBackendPlayer(params.bid, {
				name: playerName,
				region: params.guildId ?? params.channelId
			}, params.request)).name }
		};
	} catch (error) {
		if (error instanceof BackendAPIError) {
			if (error.status === 409) return { code: "NAME_TAKEN" };
			if (error.status === 400 || error.code === "INVALID_ARGUMENT") return {
				code: "INVALID_NAME",
				data: { message: error.message || "道号不符合要求，请重新输入。" }
			};
		}
		logger.error("创建存档失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };