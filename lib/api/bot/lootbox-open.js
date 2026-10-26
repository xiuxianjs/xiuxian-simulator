import { BackendAPIError, requestBackend, writeContext } from "./client.js";

//#region src/api/bot/lootbox-open.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("礼盒接口响应不完整");
	return value;
}
function integer(value, field) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error(`礼盒接口字段无效: ${field}`);
	return value;
}
async function openBackendLootbox(bid, uid, reference, openCount, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseLootboxOpen(record(await requestBackend(bid, "post_players_id_lootboxes_open", {
		path: { id: uid },
		body: {
			lootboxName: reference,
			openCount
		},
		...writeContext(request)
	})));
}
function parseLootboxOpen(value) {
	const data = record(value);
	if (typeof data.lootboxName !== "string" || !Array.isArray(data.rewards)) throw new Error("礼盒接口响应不完整");
	return {
		lootboxName: data.lootboxName,
		openCount: integer(data.openCount, "openCount"),
		rewards: data.rewards.map((value) => {
			const reward = record(value);
			if (typeof reward.category !== "string" || typeof reward.name !== "string") throw new Error("礼盒奖励响应不完整");
			return {
				category: reward.category,
				rewardId: integer(reward.rewardId, "rewardId"),
				name: reward.name,
				quantity: integer(reward.quantity, "quantity")
			};
		})
	};
}
function lootboxExpectedFailure(error) {
	if (!(error instanceof BackendAPIError) || !error.details || typeof error.details !== "object" || Array.isArray(error.details)) return null;
	const details = error.details;
	if (error.status === 404 && error.code === "LOOTBOX_NOT_FOUND" && typeof details.nameOrId === "string") return {
		code: "NOT_FOUND",
		nameOrId: details.nameOrId
	};
	if (error.status === 409 && error.code === "LOOTBOX_NOT_OWNED" && typeof details.lootboxName === "string") return {
		code: "NOT_OWNED",
		lootboxName: details.lootboxName
	};
	return null;
}

//#endregion
export { lootboxExpectedFailure, openBackendLootbox, parseLootboxOpen };