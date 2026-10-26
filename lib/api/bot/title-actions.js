import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/title-actions.ts
function object(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("称号操作响应不完整");
	return value;
}
async function activateBackendTitle(bid, uid, titleId, request) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0 || !Number.isSafeInteger(titleId) || titleId <= 0) throw new Error("佩戴称号参数无效");
	return validateBackendActivatedTitle(await requestBackend(bid, "post_players_id_titles_titleId_activate", {
		path: {
			id: uid,
			titleId
		},
		...writeContext(request)
	}), titleId);
}
function validateBackendActivatedTitle(data, titleId) {
	const row = object(data);
	if (row.id !== titleId || typeof row.title !== "string" || typeof row.isActive !== "boolean" || !row.isActive) throw new Error("佩戴称号响应不完整");
	return {
		id: row.id,
		title: row.title,
		isActive: row.isActive
	};
}
async function deactivateBackendTitle(bid, uid, request) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) throw new Error("卸下称号参数无效");
	return validateBackendDeactivatedTitle(await requestBackend(bid, "post_players_id_titles_deactivate", {
		path: { id: uid },
		...writeContext(request)
	}));
}
function validateBackendDeactivatedTitle(data) {
	const row = object(data);
	if (typeof row.removed !== "boolean") throw new Error("卸下称号响应不完整");
	return { removed: row.removed };
}

//#endregion
export { activateBackendTitle, deactivateBackendTitle, validateBackendActivatedTitle, validateBackendDeactivatedTitle };