import { applyBackendGlossaryEdit } from "../../../api/bot/glossary-apply.js";

//#region src/response-apps/glossary/apply/app.ts
const GLOSSARY_APPLY_REASON_MAX_LENGTH = 100;
function parseApplyParams(messageText) {
	return { reason: (messageText ?? "").trim().replace(/^(!|！|\/|#|＃)?申请词典编辑权限\s*/, "").trim() || "" };
}
async function applyGlossaryEditPermission(bid, reason, request) {
	const result = await applyBackendGlossaryEdit(bid, reason, request);
	if (result.outcome === "submitted") return { success: true };
	return {
		success: false,
		reason: {
			reason_too_long: `申请理由不能超过${100}字`,
			already_allowed: "你已拥有词典编辑权限，无需重复申请",
			pending: "你已有待审核的词典编辑申请，请耐心等待",
			player_missing: "玩家数据异常，请稍后再试",
			realm_missing: "境界信息不存在，请稍后再试",
			realm_locked: "需达到金丹初期后才可申请词典编辑权限"
		}[result.outcome]
	};
}

//#endregion
export { GLOSSARY_APPLY_REASON_MAX_LENGTH, applyGlossaryEditPermission, parseApplyParams };