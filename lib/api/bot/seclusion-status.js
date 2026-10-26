import { requestBackend } from "./client.js";

//#region src/api/bot/seclusion-status.ts
const asRecord = (value, message) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
	return value;
};
const asNumber = (value, message) => {
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(message);
	return value;
};
const asBoolean = (value, message) => {
	if (typeof value !== "boolean") throw new Error(message);
	return value;
};
const asString = (value, message) => {
	if (typeof value !== "string") throw new Error(message);
	return value;
};
const asInteger = (value, message) => {
	if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new Error(message);
	return value;
};
const optionalString = (value, message) => value === void 0 ? void 0 : asString(value, message);
function parsePreview(value, message) {
	const row = asRecord(value, message);
	if (!Array.isArray(row.rareDrops)) throw new Error(message);
	return {
		duration: asInteger(row.duration, message),
		dungeonId: asInteger(row.dungeonId, message),
		experience: asInteger(row.experience, message),
		spiritStone: asInteger(row.spiritStone, message),
		huanHunDan: asInteger(row.huanHunDan, message),
		yangShenDan: asInteger(row.yangShenDan, message),
		premium: asBoolean(row.premium, message),
		...row.projectedCreditedExperience === void 0 ? {} : { projectedCreditedExperience: asInteger(row.projectedCreditedExperience, message) },
		...row.materialProgressPercent === void 0 ? {} : { materialProgressPercent: asNumber(row.materialProgressPercent, message) },
		...row.projectedGatheredCount === void 0 ? {} : { projectedGatheredCount: asInteger(row.projectedGatheredCount, message) },
		...row.experienceCapWarning === void 0 ? {} : { experienceCapWarning: asBoolean(row.experienceCapWarning, message) },
		...row.breakthroughReady === void 0 ? {} : { breakthroughReady: asBoolean(row.breakthroughReady, message) },
		...row.expectedHuanHunDan === void 0 ? {} : { expectedHuanHunDan: asNumber(row.expectedHuanHunDan, message) },
		...row.expectedYangShenDan === void 0 ? {} : { expectedYangShenDan: asNumber(row.expectedYangShenDan, message) },
		soulDew: asInteger(row.soulDew, message),
		rareDrops: row.rareDrops.map((drop) => {
			const item = asRecord(drop, message);
			return {
				name: asString(item.name, message),
				quantity: asInteger(item.quantity, message)
			};
		})
	};
}
function parseStatus(value) {
	const row = asRecord(value, "探索状态响应不完整");
	if (!Array.isArray(row.availableDungeons)) throw new Error("探索状态响应不完整");
	const availableDungeons = row.availableDungeons.map(parseDungeon);
	const policy = asRecord(row.earlyExitPolicy, "探索状态响应不完整");
	const result = {
		inSeclusion: asBoolean(row.inSeclusion, "探索状态响应不完整"),
		...row.recommendedDuration === void 0 ? {} : { recommendedDuration: asInteger(row.recommendedDuration, "探索推荐行程响应不完整") },
		startAvailable: asBoolean(row.startAvailable, "探索状态响应不完整"),
		startReason: optionalString(row.startReason, "探索状态响应不完整"),
		canEnd: asBoolean(row.canEnd, "探索状态响应不完整"),
		endReason: optionalString(row.endReason, "探索状态响应不完整"),
		earlyExitPolicy: {
			settleBlockHours: asInteger(policy.settleBlockHours, "探索状态响应不完整"),
			refundBeforeHours: asInteger(policy.refundBeforeHours, "探索状态响应不完整"),
			penaltyBeforeHours: asInteger(policy.penaltyBeforeHours, "探索状态响应不完整"),
			penaltyRate: asNumber(policy.penaltyRate, "探索状态响应不完整")
		},
		availableDungeons
	};
	if (result.inSeclusion) {
		const record = asRecord(row.record, "探索记录响应不完整");
		result.record = {
			id: asInteger(record.id, "探索记录响应不完整"),
			duration: asInteger(record.duration, "探索记录响应不完整"),
			dungeonId: asInteger(record.dungeonId, "探索记录响应不完整"),
			elapsedHours: asInteger(row.elapsedHours, "探索记录响应不完整"),
			remainingHours: asInteger(row.remainingHours, "探索记录响应不完整"),
			settleableBlocks: asInteger(row.settleableBlocks, "探索记录响应不完整"),
			settleableHours: asInteger(row.settleableHours, "探索记录响应不完整"),
			isCompleted: asBoolean(row.isCompleted, "探索记录响应不完整"),
			dungeonName: optionalString(row.dungeonName, "探索记录响应不完整")
		};
	}
	return result;
}
function parseDungeon(value, index) {
	const dungeon = asRecord(value, `探索秘境响应不完整（${index}）`);
	if (!Array.isArray(dungeon.startOptions)) throw new Error(`探索秘境响应不完整（${index}）`);
	return {
		id: asInteger(dungeon.id, `探索秘境响应不完整（${index}）`),
		name: asString(dungeon.name, `探索秘境响应不完整（${index}）`),
		startOptions: dungeon.startOptions.map((value, optionIndex) => {
			const option = asRecord(value, `探索时长响应不完整（${index}:${optionIndex}）`);
			return {
				duration: asInteger(option.duration, "探索时长响应不完整"),
				spiritCost: asInteger(option.spiritCost, "探索时长响应不完整"),
				available: asBoolean(option.available, "探索时长响应不完整"),
				reason: optionalString(option.reason, "探索时长响应不完整"),
				preview: parsePreview(option.preview, "探索收益预览响应不完整")
			};
		})
	};
}
async function getBackendSeclusionSelection(bid, uid, dungeonName) {
	if (!bid) throw new Error("查询缺少平台身份");
	await requestBackend(bid, "post_players_id_seclusion_active_marker_repair", { path: { id: uid } });
	const row = asRecord(await requestBackend(bid, "get_players_id_seclusion_selection", {
		path: { id: uid },
		query: { dungeonName }
	}), "探索选择响应不完整");
	if (row.code === "IN_SECLUSION") return {
		code: "IN_SECLUSION",
		status: parseStatus(row.status)
	};
	if (row.code === "DUNGEON_NOT_FOUND") return {
		code: "DUNGEON_NOT_FOUND",
		message: asString(row.message, "探索选择响应不完整")
	};
	if (row.code === "OK") return {
		code: "OK",
		status: parseStatus(row.status),
		dungeon: parseDungeon(row.dungeon, 0)
	};
	throw new Error("探索选择响应不完整");
}
async function guardBackendSeclusionCommand(bid, uid, command) {
	if (!bid) throw new Error("查询缺少平台身份");
	const data = await requestBackend(bid, "post_players_id_seclusion_guard", {
		path: { id: uid },
		body: { command }
	});
	if (!data || typeof data.inSeclusion !== "boolean" || typeof data.allowed !== "boolean") throw new Error("探索指令准入接口返回不完整，请更新服务端后重试");
	return data;
}
async function getBackendSeclusionDisplay(bid, uid) {
	if (!bid?.trim()) throw new Error("查询缺少平台身份");
	if (!Number.isSafeInteger(uid) || uid < 1) throw new Error("探索状态查询参数无效");
	await requestBackend(bid, "post_players_id_seclusion_active_marker_repair", { path: { id: uid } });
	return parseStatus(await requestBackend(bid, "get_players_id_seclusion", { path: { id: uid } }));
}

//#endregion
export { getBackendSeclusionDisplay, getBackendSeclusionSelection, guardBackendSeclusionCommand, parseDungeon, parseStatus };