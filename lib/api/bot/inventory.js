import { requestBackend } from "./client.js";

//#region src/api/bot/inventory.ts
const record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
const identifier = (value) => integer(value) && value >= 0;
const gradeReference = (value) => value === null || record(value) && identifier(value.id) && typeof value.name === "string" && identifier(value.realmId);
const realmReference = (value) => value === null || record(value) && identifier(value.id) && typeof value.name === "string" && integer(value.level);
const inventoryCapability = (value) => record(value) && typeof value.kind === "string" && (value.recipeId === void 0 ? value.kind !== "viewRecipe" : identifier(value.recipeId) && value.recipeId > 0);
/** Reject incomplete data contracts instead of supplementing them from Node models. */
async function getBackendInventory(bid, uid, query, request) {
	return parseBackendInventory(await requestBackend(bid, "get_players_id_inventory", {
		path: { id: uid },
		query: {
			...query,
			view: "bag"
		},
		requestId: request?.requestId
	}));
}
function parseBackendInventory(value) {
	if (!record(value) || typeof value.activeSubcategory !== "string" || !record(value.pagination) || !Array.isArray(value.items) || !Array.isArray(value.capabilities) || !integer(value.playerStageLevel) || ![
		value.pagination.page,
		value.pagination.pageSize,
		value.pagination.total,
		value.pagination.totalPages
	].every(identifier) || Number(value.pagination.page) < 1 || Number(value.pagination.pageSize) < 1 || !value.capabilities.every(inventoryCapability) || !value.items.every((item) => record(item) && identifier(item.id) && identifier(item.userItemId) && identifier(item.itemId) && typeof item.name === "string" && typeof item.type === "string" && (item.subtype === null || typeof item.subtype === "string") && integer(item.quantity) && integer(item.listedQuantity) && integer(item.stackMax) && integer(item.permission) && typeof item.isStackable === "boolean" && (integer(item.isLocked) || typeof item.isLocked === "boolean") && gradeReference(item.grade) && realmReference(item.realm) && Object.hasOwn(item, "effect") && Array.isArray(item.capabilities) && item.capabilities.every(inventoryCapability))) throw new Error("背包接口返回不完整，请更新服务端后重试");
	return value;
}
function parseRobotStorageBag(value) {
	const remote = parseBackendInventory(value);
	return {
		activeSubcategory: remote.activeSubcategory,
		page: remote.pagination.page,
		total: remote.pagination.total,
		pageSize: remote.pagination.pageSize,
		items: remote.items,
		capabilities: remote.capabilities
	};
}
function parseRobotStorageMenu(value) {
	if (!record(value) || typeof value.message !== "string") throw new Error("储物袋菜单响应不完整");
	return { message: value.message };
}

//#endregion
export { getBackendInventory, parseBackendInventory, parseRobotStorageBag, parseRobotStorageMenu };