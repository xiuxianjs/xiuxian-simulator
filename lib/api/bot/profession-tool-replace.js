import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/profession-tool-replace.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("替换职业工具响应不完整");
	return value;
}
function integer(value, minimum = Number.MIN_SAFE_INTEGER) {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) throw new Error("替换职业工具响应不完整");
	return value;
}
function text(value) {
	if (typeof value !== "string") throw new Error("替换职业工具响应不完整");
	return value;
}
async function replaceBackendProfessionTool(bid, uid, identifier, request) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseProfessionToolReplace(await requestBackend(bid, "post_players_id_profession_tools_replace", {
		path: { id: uid },
		body: { identifier },
		headers: repeatPresentationHeaders("切换天工"),
		...writeContext(request)
	}));
}
function parseProfessionToolReplace(value) {
	const data = record(value);
	return {
		toolId: integer(data.toolId, 1),
		userToolId: integer(data.userToolId, 1),
		toolName: text(data.toolName),
		typeName: text(data.typeName),
		gradeName: text(data.gradeName),
		gradeLevel: integer(data.gradeLevel),
		message: text(data.message)
	};
}

//#endregion
export { parseProfessionToolReplace, replaceBackendProfessionTool };