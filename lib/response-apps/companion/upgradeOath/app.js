import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendSocialAccess } from "../../../api/bot/queries.js";
import { upgradeBackendCompanionOath } from "../../../api/bot/companion-relationship-actions.js";
import { confirmBackendCompanionOverview } from "../../../api/bot/interaction-overview.js";
import { getBackendCompanionOathUpgradePreview } from "../../../api/bot/companion-oath-preview.js";
import "../../../api/index.js";

//#region src/response-apps/companion/upgradeOath/app.ts
async function checkUpgradeOath(params) {
	try {
		if (!params.bid) throw new Error("查询缺少平台身份");
		const overview = params.confirmed ? await confirmBackendCompanionOverview(params.bid, params.uid, "upgrade", params.request, params.messageText) : null;
		const access = overview ? {
			ok: overview.info.access.canUseFifthLayerFeature,
			realmName: overview.info.access.realmName ?? "未知"
		} : await getBackendSocialAccess(params.bid, params.uid);
		if (!access.ok) return {
			code: "FAIL",
			data: {
				message: "当前境界不足，需达到炼气五层后开启该功能",
				access
			}
		};
		const preview = overview ? overview.preview : await getBackendCompanionOathUpgradePreview(params.bid, params.uid);
		if (!preview) throw new Error("誓约升级预览数据不完整");
		const settledResult = overview ? overview.mutationError ? {
			code: "FAIL",
			data: { message: overview.mutationError }
		} : {
			code: "OK",
			data: { message: overview.mutation?.message ?? "" }
		} : void 0;
		return {
			code: "CONFIRM_NEEDED",
			data: {
				...preview,
				access,
				settledResult
			}
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "无法查询誓约升级条件" }
		};
	}
}
async function confirmUpgradeOath(params) {
	try {
		return {
			code: "OK",
			data: { message: (await upgradeBackendCompanionOath(params.bid, params.uid, params.request)).message }
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof BackendAPIError ? error.message : "升级誓约失败，请稍后再试" }
		};
	}
}

//#endregion
export { checkUpgradeOath, confirmUpgradeOath };