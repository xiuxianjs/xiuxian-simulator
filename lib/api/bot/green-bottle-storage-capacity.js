import { requestBackend } from "./client.js";

//#region src/api/bot/green-bottle-storage-capacity.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("小绿瓶存储容量响应不完整");
	return value;
}
function integer(value, field) {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new Error(`小绿瓶存储容量${field}不完整`);
	return value;
}
async function getBackendGreenBottleStorageCapacity(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return parseGreenBottleCapacity(record(await requestBackend(bid, "get_players_id_green_bottle_storage_capacity", { path: { id: uid } })));
}
function parseGreenBottleCapacity(data) {
	const experienceCost = integer(data.experienceCost, "经验成本");
	if (experienceCost < 1) throw new Error("小绿瓶存储容量经验成本无效");
	const maxAvailable = integer(data.maxAvailable, "可存储数量");
	if (typeof data.canStore !== "boolean") throw new Error("小绿瓶存储容量状态不完整");
	if (data.canStore !== maxAvailable > 0) throw new Error("小绿瓶存储容量状态不一致");
	return {
		experienceCost,
		maxAvailable,
		canStore: data.canStore
	};
}

//#endregion
export { getBackendGreenBottleStorageCapacity, parseGreenBottleCapacity };