import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";
import { parseSkillBookMaximum } from "../schemas/skill-book-maximum.js";

//#region src/api/bot/skill-book-switch.ts
const skillTypes = /* @__PURE__ */ new Set([
	"战技",
	"被动技",
	"神通"
]);
function summary(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return;
	const row = value;
	if (typeof row.id !== "number" || !Number.isSafeInteger(row.id) || row.id < 1 || typeof row.name !== "string" || typeof row.skillType !== "string" || !skillTypes.has(row.skillType)) return;
	return {
		id: row.id,
		name: row.name,
		skillType: row.skillType
	};
}
async function switchBackendSkillBook(bid, uid, skillBookId, skillType, force, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	return parseSkillBookSwitchResponse(await requestBackend(bid, "post_players_id_skill_books_skillBookId_switch", {
		path: {
			id: uid,
			skillBookId
		},
		body: {
			skillType,
			force
		},
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}
function parseSkillBookSwitchResponse(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("切换功法响应不完整");
	const row = data;
	const book = summary(row.skillBook);
	const old = row.oldSkillBook === void 0 ? void 0 : summary(row.oldSkillBook);
	const targetMaximum = row.targetMaximum === void 0 ? void 0 : parseSkillBookMaximum(row.targetMaximum);
	const oldMaximum = row.oldMaximum === void 0 ? void 0 : parseSkillBookMaximum(row.oldMaximum);
	const comparisonLines = Array.isArray(row.comparisonLines) && row.comparisonLines.every((line) => typeof line === "string") ? row.comparisonLines : void 0;
	const confirmationMessage = typeof row.confirmationMessage === "string" ? row.confirmationMessage : void 0;
	if (!book || row.outcome !== "switched" && row.outcome !== "confirmation_required") throw new Error("切换功法响应不完整");
	if (row.outcome === "confirmation_required" && (!old || !targetMaximum || !oldMaximum || !comparisonLines || !confirmationMessage)) throw new Error("切换功法确认数据不完整");
	return {
		outcome: row.outcome,
		skillBook: book,
		oldSkillBook: old,
		targetMaximum,
		oldMaximum,
		comparisonLines,
		confirmationMessage
	};
}

//#endregion
export { parseSkillBookSwitchResponse, switchBackendSkillBook };