import { getBackendGreenBottleStorageCapacity } from "../../../api/bot/green-bottle-storage-capacity.js";
import { storeBackendGreenBottle } from "../../../api/bot/green-bottle-store.js";

//#region src/response-apps/greenBottle/store/app.ts
/** 解析存储数量参数 */
function parseStoreParams(messageText) {
	return (messageText || "").replace(/^(!|！|\/|#|＃)?小绿瓶存储\s*/, "").trim();
}
/** 无参数展示读取服务端容量投影。 */
function getStorageCapacity(bid, uid) {
	return getBackendGreenBottleStorageCapacity(bid, uid);
}
/** 执行服务端存储转换。 */
function storeBottles(bid, uid, count, request) {
	return storeBackendGreenBottle(bid, uid, count, request);
}

//#endregion
export { getStorageCapacity, parseStoreParams, storeBottles };