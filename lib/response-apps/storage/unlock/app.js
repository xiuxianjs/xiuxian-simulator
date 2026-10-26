import { storageLockSelector } from "../../../utils/storage-lock-view.js";
import { setBackendStorageLock } from "../../../api/bot/storage-lock.js";
import { logger } from "alemonjs";

//#region src/response-apps/storage/unlock/app.ts
async function App(params) {
	try {
		const selector = storageLockSelector(params);
		if (!("kind" in selector)) return {
			code: "OK",
			data: selector
		};
		return {
			code: "OK",
			data: (await setBackendStorageLock(params.bid, params.uid, {
				locked: false,
				selector
			}, params.request)).view
		};
	} catch (error) {
		logger.error("解锁物品失败:", error);
		return {
			code: "LOAD_FAILED",
			data: { message: error instanceof Error ? error.message : "解锁失败" }
		};
	}
}

//#endregion
export { App as default };