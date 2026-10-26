//#region src/api/bot/pk-management.ts
const pkAssetLabels = {
	item: "物品",
	equipment: "装备",
	skillBook: "功法",
	soulArtifact: "本命物"
};
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("PK响应格式不完整");
	return value;
}
function integer(value, minimum = 0) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) throw new Error("PK响应数量无效");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("PK响应文本不完整");
	return value;
}
function list(value) {
	if (!Array.isArray(value)) throw new Error("PK响应缺少列表");
	return value;
}
function kind(value) {
	if (typeof value !== "string" || !Object.hasOwn(pkAssetLabels, value)) throw new Error("PK物品类别无效");
	return value;
}
function parsePKAssetKind(value) {
	if (!value) return "item";
	return Object.entries(pkAssetLabels).find(([key, label]) => key === value || label === value)?.[0] ?? null;
}
function parsePKCommandInteger(value, fallback) {
	if (value === void 0) return fallback ?? null;
	if (!/^\d+$/.test(value)) return null;
	const number = Number(value);
	return Number.isSafeInteger(number) ? number : null;
}
function cursor(value) {
	return value === void 0 ? void 0 : integer(value, 1);
}
function parseView(value, uid) {
	const view = record(value);
	for (const raw of list(view.assets)) {
		const state = record(raw);
		kind(state.assetKind);
		integer(state.assetId, 1);
		if (integer(state.ownerId, 1) !== uid) throw new Error("隐藏资产归属不匹配");
		integer(state.hiddenQuantity);
		integer(state.heldQuantity);
	}
	return {
		capacity: integer(view.capacity),
		used: integer(view.used)
	};
}
function parsePKTargets(value) {
	const data = record(value);
	if (typeof data.canAttack !== "boolean") throw new Error("PK资格状态不完整");
	return {
		canAttack: data.canAttack,
		reason: text(data.reason),
		qiCost: integer(data.qiCost),
		dailyRemaining: integer(data.dailyRemaining),
		dailyLimit: integer(data.dailyLimit),
		nextCursor: cursor(data.nextCursor),
		items: list(data.items).map((raw) => {
			const row = record(raw);
			const chance = row.itemChancePercent;
			if (typeof chance !== "number" || !Number.isFinite(chance) || chance < 0 || chance > 100) throw new Error("PK候选概率无效");
			const rewardPercent = integer(row.rewardPercent);
			if (rewardPercent > 100) throw new Error("PK灵石档位无效");
			return {
				uid: integer(row.uid, 1),
				name: text(row.name),
				realmName: text(row.realmName),
				sameTargetRemaining: integer(row.sameTargetRemaining),
				pairOrdinal: integer(row.pairOrdinal, 1),
				rewardPercent,
				itemChancePercent: chance
			};
		})
	};
}
function parsePKHiding(value, uid) {
	const data = record(value);
	const inventory = record(data.inventory);
	const assetKind = kind(data.assetKind);
	return {
		assetKind,
		view: parseView(data.view, uid),
		nextCursor: cursor(inventory.nextCursor),
		items: list(inventory.items).map((raw) => {
			const row = record(raw);
			if (kind(row.assetKind) !== assetKind) throw new Error("隐藏物品类别不一致");
			return {
				assetKind,
				assetId: integer(row.assetId, 1),
				name: text(row.name),
				quantity: integer(row.quantity),
				hiddenQuantity: integer(row.hiddenQuantity),
				heldQuantity: integer(row.heldQuantity),
				maxHiddenQuantity: integer(row.maxHiddenQuantity),
				protectionText: text(row.protectionText)
			};
		})
	};
}
function parsePKHide(value, uid) {
	const data = record(value);
	return {
		assetKind: kind(data.assetKind),
		assetId: integer(data.assetId, 1),
		quantity: integer(data.quantity),
		view: parseView(data.view, uid)
	};
}

//#endregion
export { parsePKAssetKind, parsePKCommandInteger, parsePKHide, parsePKHiding, parsePKTargets, pkAssetLabels };