import { BackendAPIError } from "./client.js";
import { validateSettingsOverview } from "./player-overview.js";

//#region src/api/bot/settings-robot-query.ts
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function validateRobotSettingsOverview(value) {
	const invalid = () => {
		throw new BackendAPIError("设置聚合响应不完整", "SDK_INVALID_RESPONSE");
	};
	if (!record(value) || !Object.hasOwn(value, "groupSnapshot") || value.groupSnapshotUnavailable !== void 0 && typeof value.groupSnapshotUnavailable !== "boolean") return invalid();
	const snapshot = value.groupSnapshot;
	if (snapshot !== null) {
		if (!record(snapshot) || snapshot.acquired !== false || typeof snapshot.previous !== "string" || snapshot.permission !== null && (!record(snapshot.permission) || ![
			"allowed",
			"blocked",
			"unknown"
		].includes(String(snapshot.permission.state))) || [snapshot.availability, snapshot.member].some((row) => row !== null && (!record(row) || typeof row.available !== "boolean"))) return invalid();
	}
	return {
		...validateSettingsOverview(value),
		groupSnapshot: snapshot,
		groupSnapshotUnavailable: value.groupSnapshotUnavailable === true
	};
}
function validateRobotPreference(data, field, expected, action) {
	if (!record(data) || data[field] !== expected) throw new BackendAPIError("偏好设置响应不完整", "SDK_INVALID_RESPONSE");
	return action;
}

//#endregion
export { validateRobotPreference, validateRobotSettingsOverview };