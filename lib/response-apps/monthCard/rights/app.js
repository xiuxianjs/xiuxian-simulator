import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendRechargeRights } from "../../../api/bot/recharge-rights-queries.js";
import { projectRightsPanel } from "../../../api/bot/membership-panels.js";
import { logger } from "alemonjs";

//#region src/response-apps/monthCard/rights/app.ts
/** 我的权益展示适配：游戏事实只来自 recharge/rights，文案与图片保留客户端。 */
async function App(params) {
	const { uid, avatarURL, bid } = params;
	try {
		const data = await getBackendRechargeRights(bid, uid);
		return projectRightsPanel(data, avatarURL);
	} catch (error) {
		if (error instanceof BackendAPIError && error.status === 404) return { code: "INVALID_USER" };
		logger.error("我的权益查询失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };