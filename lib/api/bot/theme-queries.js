import { requestBackend } from "./client.js";

//#region src/api/bot/theme-queries.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("主题查询接口数据不完整");
	return value;
}
const integer = (value) => typeof value === "number" && Number.isSafeInteger(value);
async function getBackendThemes(bid, uid) {
	if (!bid) throw new Error("查询缺少平台身份");
	return validateBackendThemes(await requestBackend(bid, "get_players_id_themes", { path: { id: uid } }));
}
function validateBackendThemes(value) {
	const data = record(value);
	const permission = record(data.permission);
	if (!Array.isArray(data.themes) || typeof permission.canCustomEdit !== "boolean" || !integer(permission.maxCustomSlots)) throw new Error("主题查询接口数据不完整");
	if (permission.requiredVipLevel !== void 0 && (!integer(permission.requiredVipLevel) || permission.requiredVipLevel < 1)) throw new Error("主题查询接口数据不完整");
	return {
		themes: data.themes.map((value) => {
			const row = record(value);
			if (!integer(row.id) || row.id < 1 || typeof row.name !== "string" || typeof row.config !== "string" || row.source !== "system" && row.source !== "custom" || typeof row.isActive !== "boolean" || !integer(row.sortOrder)) throw new Error("主题查询接口数据不完整");
			return {
				id: row.id,
				name: row.name,
				config: row.config,
				source: row.source,
				isActive: row.isActive,
				sortOrder: row.sortOrder
			};
		}),
		permission: {
			canCustomEdit: permission.canCustomEdit,
			maxCustomSlots: permission.maxCustomSlots,
			...permission.requiredVipLevel === void 0 ? {} : { requiredVipLevel: permission.requiredVipLevel }
		}
	};
}

//#endregion
export { getBackendThemes, validateBackendThemes };