import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/skill-book-upgrade.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("升级功法接口响应不完整");
	return value;
}
function integer(row, field) {
	if (!Number.isSafeInteger(row[field])) throw new Error(`升级功法接口字段无效: ${field}`);
	return row[field];
}
function numberValue(row, field) {
	if (typeof row[field] !== "number" || !Number.isFinite(row[field])) throw new Error(`升级功法接口字段无效: ${field}`);
	return row[field];
}
function changes(value) {
	if (!Array.isArray(value)) throw new Error("升级功法接口字段无效: items");
	return value.map((item) => {
		const row = record(item);
		if (typeof row.name !== "string") throw new Error("升级功法接口字段无效: item.name");
		return {
			itemId: integer(row, "itemId"),
			name: row.name,
			quantity: integer(row, "quantity"),
			expValue: integer(row, "expValue")
		};
	});
}
async function upgradeBackendSkillBook(bid, uid, skillBookId, request) {
	if (!bid) throw new Error("缺少平台身份");
	const row = record(await requestBackend(bid, "post_players_id_skill_books_skillBookId_upgrade", {
		path: {
			id: uid,
			skillBookId
		},
		body: {},
		...writeContext(request)
	}));
	if (row.outcome !== "upgraded" && row.outcome !== "no_skill_books" && row.outcome !== "not_found") throw new Error("升级功法接口响应不完整");
	if (row.outcome !== "upgraded") return { outcome: row.outcome };
	const skillBookRow = record(row.skillBook);
	if (typeof skillBookRow.name !== "string" || typeof skillBookRow.skillType !== "string") throw new Error("升级功法接口字段无效: skillBook");
	if (typeof row.attribute !== "string" || typeof row.isNewAttribute !== "boolean") throw new Error("升级功法接口字段无效: attribute");
	return {
		outcome: "upgraded",
		skillBook: {
			id: integer(skillBookRow, "id"),
			name: skillBookRow.name,
			skillType: skillBookRow.skillType
		},
		upgradeCount: integer(row, "upgradeCount"),
		consumedExp: integer(row, "consumedExp"),
		consumedSpiritStone: integer(row, "consumedSpiritStone"),
		consumedItems: changes(row.consumedItems),
		overflowExp: integer(row, "overflowExp"),
		refundedItems: changes(row.refundedItems),
		attributeUpgrade: {
			name: row.attribute,
			growth: numberValue(row, "growth"),
			currentValue: numberValue(row, "currentValue"),
			maxValue: numberValue(row, "maxValue"),
			isNew: row.isNewAttribute
		}
	};
}

//#endregion
export { upgradeBackendSkillBook };