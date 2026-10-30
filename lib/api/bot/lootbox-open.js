import { BackendAPIError, requestBackend, writeContext } from "./client.js";
import { parseLootboxSelection } from "../schemas/lootbox-selection.js";

//#region src/api/bot/lootbox-open.ts
function lootboxTreasureArgument(parts) {
	if (parts.length < 3) return;
	const treasureId = Number(parts[2]);
	if (parts.length !== 3 || !Number.isSafeInteger(treasureId) || treasureId < 1 || !/^\d+$/.test(parts[2]) || Number(parts[1]) !== 1) throw new Error("自选宝盒每次只能开启1个，请使用 /开启礼盒 礼盒ID 1 宝物ID");
	return treasureId;
}
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("礼盒接口响应不完整");
	return value;
}
function integer(value, field) {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error(`礼盒接口字段无效: ${field}`);
	return value;
}
async function openBackendLootbox(bid, uid, reference, openCount, request, treasureId) {
	if (!bid) throw new Error("操作缺少平台身份");
	if (treasureId !== void 0 && (!Number.isSafeInteger(treasureId) || treasureId < 1 || openCount !== 1)) throw new Error("自选宝盒每次只能开启1个，宝物ID必须为正整数");
	const body = {
		lootboxName: reference,
		openCount,
		...treasureId === void 0 ? {} : { treasureId }
	};
	return parseLootboxOpen(record(await requestBackend(bid, "post_players_id_lootboxes_open", {
		path: { id: uid },
		body,
		...writeContext(request)
	})));
}
function parseLootboxOpen(value) {
	const data = record(value);
	if (typeof data.lootboxName !== "string" || !Array.isArray(data.rewards)) throw new Error("礼盒接口响应不完整");
	const result = {
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
	if (data.lootboxId !== void 0) {
		result.lootboxId = integer(data.lootboxId, "lootboxId");
		if (result.lootboxId < 1) throw new Error("宝盒编号无效");
	}
	if (data.selection !== void 0) {
		result.selection = parseLootboxSelection(data.selection);
		if (!result.lootboxId || result.openCount !== 0 || result.rewards.length !== 0) throw new Error("宝盒自选预览不完整");
	}
	return result;
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
export { lootboxExpectedFailure, lootboxTreasureArgument, openBackendLootbox, parseLootboxOpen };