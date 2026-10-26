import { BackendAPIError } from "../../../api/bot/client.js";
import { getBackendTongtianTower, sweepBackendTongtianTower } from "../../../api/bot/tongtian-tower.js";

//#region src/response-apps/ranking/sweepLower/app.ts
async function App(params) {
	const match = (params.messageText || "").match(/扫荡排名\s+(\d+)(?:\s+(\d+))?\s*$/);
	try {
		if (!match) {
			const view = await getBackendTongtianTower(params.bid, params.uid);
			if (!view.isOpen) return {
				code: "FAILED",
				uid: params.uid,
				message: view.message ?? "通天塔暂未开放"
			};
			return view.sweepTargets.length ? {
				code: "LIST",
				data: {
					myRank: view.myRank,
					entries: view.sweepTargets
				}
			} : { code: "LIST_EMPTY" };
		}
		return {
			code: "SWEEP",
			data: await sweepBackendTongtianTower(params.bid, params.uid, Number(match[1]), Number(match[2] ?? 5), params.request)
		};
	} catch (error) {
		const message = error instanceof BackendAPIError ? error.message : error instanceof Error ? error.message : "扫荡排名失败，请稍后再试";
		return {
			code: "FAILED",
			uid: params.uid,
			message,
			needPotion: error instanceof BackendAPIError && error.code === "TONGTIAN_INSUFFICIENT_QI"
		};
	}
}

//#endregion
export { App as default };