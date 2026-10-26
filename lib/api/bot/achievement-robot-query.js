import { BackendAPIError } from "./client.js";

//#region src/api/bot/achievement-robot-query.ts
function validateGuardedAchievement(value, decode) {
	const row = value;
	const access = row?.access;
	if (!row || typeof row !== "object" || Array.isArray(row) || !access || typeof access !== "object" || typeof access.canUseFifthLayerFeature !== "boolean" || typeof access.realmName !== "string") throw new BackendAPIError("成就资格响应不完整", "SDK_INVALID_RESPONSE");
	if (!access.canUseFifthLayerFeature) {
		if (row.data !== null) throw new BackendAPIError("成就资格响应矛盾", "SDK_INVALID_RESPONSE");
		return {
			locked: true,
			realmName: access.realmName
		};
	}
	return {
		locked: false,
		data: decode(row.data)
	};
}

//#endregion
export { validateGuardedAchievement };