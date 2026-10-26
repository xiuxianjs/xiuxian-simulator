import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/glossary-apply.ts
async function applyBackendGlossaryEdit(bid, reason, request) {
	if (!bid) throw new Error("申请缺少平台身份");
	const context = writeContext(request);
	return parseBackendGlossaryApply(await requestBackend(bid, "post_glossary_edit_applications", {
		body: { reason },
		...context
	}));
}
function parseBackendGlossaryApply(result) {
	if (!result || typeof result !== "object" || Array.isArray(result) || typeof result.outcome !== "string" || ![
		"submitted",
		"reason_too_long",
		"already_allowed",
		"pending",
		"player_missing",
		"realm_missing",
		"realm_locked"
	].includes(result.outcome)) throw new Error("词典申请响应不完整");
	return result;
}

//#endregion
export { applyBackendGlossaryEdit, parseBackendGlossaryApply };