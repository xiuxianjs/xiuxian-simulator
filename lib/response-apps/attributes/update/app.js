import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendAttributePanel } from "../../../api/bot/attribute-panel.js";
import { getBackendRobotIdentity } from "../../../api/bot/identity.js";
import { logger } from "alemonjs";

//#region src/response-apps/attributes/update/app.ts
/** 属性面板由服务端计算，机器人只负责身份传递与结果映射。 */
async function App(params) {
	if (!params.bid?.trim()) return {
		code: "FAIL",
		data: { message: "未找到用户信息，请先踏入仙途" }
	};
	try {
		const uid = params.uid ?? (await getBackendRobotIdentity(params.bid)).account.playerId;
		if (!uid || uid <= 0) return {
			code: "FAIL",
			data: { message: "未找到用户信息，请先踏入仙途" }
		};
		return {
			code: "OK",
			data: await getBackendAttributePanel(params.bid, uid)
		};
	} catch (error) {
		if (error instanceof BackendAPIError && error.status === 404) return {
			code: "FAIL",
			data: { message: "未找到用户信息，请先踏入仙途" }
		};
		logger.error(error);
		return {
			code: "FAIL",
			data: { message: "更新属性失败，请联系运营" }
		};
	}
}

//#endregion
export { App as default };