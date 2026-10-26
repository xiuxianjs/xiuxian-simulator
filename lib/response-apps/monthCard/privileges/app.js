import { projectPrivilegesPanel } from "../../../api/bot/membership-panels.js";
import { getBackendVipPrivileges } from "../../../api/bot/vip-privileges-queries.js";
import { logger } from "alemonjs";

//#region src/response-apps/monthCard/privileges/app.ts
async function App(params) {
	const { uid, avatarURL } = params;
	try {
		const data = await getBackendVipPrivileges(params.bid, uid);
		return projectPrivilegesPanel(data, avatarURL);
	} catch (error) {
		logger.error("我的特权查询失败:", error);
		return { code: "LOAD_FAILED" };
	}
}

//#endregion
export { App as default };