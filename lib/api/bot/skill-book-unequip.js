import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/skill-book-unequip.ts
async function unequipBackendSkillBook(bid, uid, skillType, request, repeatCommand) {
	if (!bid) throw new Error("操作缺少平台身份");
	if (skillType !== "战技" && skillType !== "被动技" && skillType !== "神通") throw new Error("功法类型无效");
	return parseBackendSkillBookUnequip(await requestBackend(bid, "post_players_id_skill_books_unequip", {
		path: { id: uid },
		body: { skillType },
		headers: repeatPresentationHeaders(repeatCommand),
		...writeContext(request)
	}));
}
function parseBackendSkillBookUnequip(data) {
	const value = data;
	if (!value || !["unequipped", "not_in_use"].includes(value.outcome) || (value.outcome === "not_in_use" ? value.skillBook !== null : !value.skillBook || [value.skillBook.name, value.skillBook.skillType].some((v) => v !== null && typeof v !== "string"))) throw new Error("换下功法响应不完整");
	return value;
}

//#endregion
export { parseBackendSkillBookUnequip, unequipBackendSkillBook };