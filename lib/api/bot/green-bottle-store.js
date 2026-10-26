import { requestBackend, writeContext } from "./client.js";
import { getBackendGreenBottleStorageCapacity } from "./green-bottle-storage-capacity.js";

//#region src/api/bot/green-bottle-store.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("小绿瓶存储接口响应不完整");
	return value;
}
function nonNegativeInteger(value, field) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`小绿瓶存储接口${field}无效`);
	return value;
}
async function storeBackendGreenBottle(bid, uid, count, request) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(count) || count < 1) throw new Error("小绿瓶存储参数无效");
	const data = record(await requestBackend(bid, "post_players_id_green_bottle_convert", {
		path: { id: uid },
		body: { count },
		...writeContext(request)
	}));
	if (data.experienceCost === void 0) data.experienceCost = (await getBackendGreenBottleStorageCapacity(bid, uid)).experienceCost;
	return parseGreenBottleStore(data);
}
function parseGreenBottleStore(data) {
	if (typeof data.success !== "boolean" || typeof data.message !== "string") throw new Error("小绿瓶存储接口响应不完整");
	const experienceCost = nonNegativeInteger(data.experienceCost, "经验成本");
	if (experienceCost < 1) throw new Error("小绿瓶存储接口经验成本无效");
	if (!data.success) return {
		success: false,
		message: data.message,
		experienceCost
	};
	return {
		success: true,
		message: data.message,
		experienceCost,
		converted: nonNegativeInteger(data.converted, "转换数量"),
		remainingExp: nonNegativeInteger(data.remainingExp, "剩余修为"),
		totalBottles: nonNegativeInteger(data.totalBottles, "小绿瓶总数")
	};
}

//#endregion
export { parseGreenBottleStore, storeBackendGreenBottle };