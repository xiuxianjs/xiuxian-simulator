import { parseGlossaryView } from "./market-community-views.js";
import { parseBackendGlossaryApply } from "./glossary-apply.js";
import { parseBackendGlossaryUpsert } from "./glossary-upsert.js";
import { parseBackendGlossaryDelete } from "./glossary-delete.js";

//#region src/api/bot/glossary-actions-robot.ts
const GLOSSARY_APPLY_REASON_MAX_LENGTH = 100;
function parseApplyParams(messageText) {
	return { reason: (messageText ?? "").trim().replace(/^(!|！|\/|#|＃)?申请词典编辑权限\s*/, "").trim() || "" };
}
/** 解析录入参数 */
function parseCreateParams(messageText) {
	const stripped = (messageText ?? "").trim().replace(/^(!|！|\/|#|＃)?录入词典\s*/, "");
	if (!stripped) return { empty: true };
	const firstSpaceIdx = stripped.search(/\s/);
	let keyword;
	let rest;
	if (firstSpaceIdx === -1) {
		keyword = stripped;
		rest = "";
	} else {
		keyword = stripped.slice(0, firstSpaceIdx);
		rest = stripped.slice(firstSpaceIdx + 1).replace(/^\s+/, "");
	}
	if (!rest) return {
		empty: false,
		noContent: true,
		keyword
	};
	return {
		empty: false,
		noContent: false,
		keyword,
		content: rest
	};
}
/** 解析删除参数 */
function parseDeleteParams(messageText) {
	return (messageText ?? "").trim().replace(/^(!|！|\/|#|＃)?删除词典\s*/, "").trim();
}
function parseRobotGlossaryApply(value) {
	if (parseBackendGlossaryApply(value).outcome !== "submitted") throw new Error("词典申请响应不完整");
	return { success: true };
}
function parseRobotGlossaryDelete(value) {
	if (parseBackendGlossaryDelete(value).outcome !== "deleted") throw new Error("词典删除响应不完整");
	return {
		success: true,
		forbidden: false,
		reason: ""
	};
}
function parseRobotGlossaryUpsert(value) {
	if (value?.mode === "help") {
		const view = parseGlossaryView(value.view, "edit_context");
		if (!view.quota?.allowed || !view.quota.withinLimit || !view.policy) throw new Error("词典帮助响应不完整");
		return {
			mode: "help",
			view,
			result: null
		};
	}
	if (value?.mode !== "write") throw new Error("词典录入响应不完整");
	const result = parseBackendGlossaryUpsert(value.result);
	if (!["created", "updated"].includes(result.outcome)) throw new Error("词典录入响应不完整");
	return {
		mode: "write",
		view: null,
		result: {
			...result,
			success: true
		}
	};
}

//#endregion
export { GLOSSARY_APPLY_REASON_MAX_LENGTH, parseApplyParams, parseCreateParams, parseDeleteParams, parseRobotGlossaryApply, parseRobotGlossaryDelete, parseRobotGlossaryUpsert };