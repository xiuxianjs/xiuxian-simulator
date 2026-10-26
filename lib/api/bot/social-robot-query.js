import { BackendAPIError } from "./client.js";

//#region src/api/bot/social-robot-query.ts
function parseGuardedSocialQuery(value, decode) {
	const invalid = () => {
		throw new BackendAPIError("社交组合响应不完整", "SDK_INVALID_RESPONSE");
	};
	if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
	const row = value;
	if (!row.access || typeof row.access !== "object" || Array.isArray(row.access)) return invalid();
	const raw = row.access;
	if (typeof raw.canUseFifthLayerFeature !== "boolean" || typeof raw.canUseSpar !== "boolean" || typeof raw.realmName !== "string") return invalid();
	const access = {
		ok: raw.canUseFifthLayerFeature,
		realmName: raw.realmName || "未知",
		canUseSpar: raw.canUseSpar
	};
	if (!access.ok) {
		if (row.data !== null) return invalid();
		return {
			access,
			data: null
		};
	}
	return {
		access,
		data: decode(row.data)
	};
}
function parseGuardedSocialAction(value, decode) {
	return parseGuardedSocialQuery(value, (data) => data === null ? null : decode(data));
}

//#endregion
export { parseGuardedSocialAction, parseGuardedSocialQuery };