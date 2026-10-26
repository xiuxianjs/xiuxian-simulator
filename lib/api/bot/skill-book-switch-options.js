import { requestBackend } from "./client.js";

//#region src/api/bot/skill-book-switch-options.ts
const skillTypes = /* @__PURE__ */ new Set([
	"战技",
	"被动技",
	"神通"
]);
function option(value, skillType) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("功法切换列表接口格式不完整");
	const row = value;
	if (!Number.isSafeInteger(row.id) || row.id <= 0 || typeof row.name !== "string" || row.skillType !== skillType || !skillTypes.has(row.skillType) || row.status !== 2 && row.status !== 3 || typeof row.isInUse !== "boolean" || typeof row.canSwitch !== "boolean") throw new Error("功法切换列表接口返回不完整");
	return {
		id: row.id,
		name: row.name,
		skillType,
		status: row.status,
		isInUse: row.isInUse,
		canSwitch: row.canSwitch
	};
}
/** Reads the exact visible, unpaged choices for one switch command type. */
async function getBackendSkillBookSwitchOptions(bid, uid, skillType) {
	if (!bid) throw new Error("查询缺少平台身份");
	const data = await requestBackend(bid, "get_players_id_skill_books_switch_options", {
		path: { id: uid },
		query: { skillType }
	});
	if (!Array.isArray(data)) throw new Error("功法切换列表接口缺少列表");
	return data.map((value) => option(value, skillType));
}
function parseSkillBookSwitchOptions(data, skillType) {
	if (!Array.isArray(data)) throw new Error("功法切换列表接口缺少列表");
	return data.map((value) => option(value, skillType));
}

//#endregion
export { getBackendSkillBookSwitchOptions, parseSkillBookSwitchOptions };