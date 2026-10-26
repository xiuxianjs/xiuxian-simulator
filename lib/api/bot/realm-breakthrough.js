import { repeatPresentationHeaders } from "./repeat-presentation.js";
import { requestBackend, writeContext } from "./client.js";

//#region src/api/bot/realm-breakthrough.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("突破接口返回不完整，请更新服务端后重试");
	return value;
}
function finite(value) {
	return typeof value === "number" && Number.isFinite(value);
}
async function performBackendRealmBreakthrough(bid, uid, request) {
	if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) throw new Error("突破操作参数无效");
	return parseRealmBreakthrough(record(await requestBackend(bid, "post_players_id_realm_breakthrough", {
		path: { id: uid },
		headers: repeatPresentationHeaders("突破"),
		...writeContext(request)
	})));
}
function parseRealmBreakthrough(value) {
	const data = record(value);
	const realm = record(data.newRealm);
	const unlockedRecipes = data.unlockedRecipes === void 0 ? [] : data.unlockedRecipes;
	const newStageName = data.newStageName === void 0 && data.isNewStage === false ? "" : data.newStageName;
	if (typeof data.message !== "string" || typeof realm.name !== "string" || ![
		"level",
		"spiritualPower",
		"speed",
		"magicAttack",
		"physicalAttack",
		"magicDefense",
		"physicalDefense",
		"experienceLimit"
	].every((key) => finite(realm[key])) || !Array.isArray(unlockedRecipes) || !unlockedRecipes.every((value) => typeof value === "string") || typeof data.isNewStage !== "boolean" || typeof newStageName !== "string" || !Array.isArray(data.masterStageMessages) || !data.masterStageMessages.every((value) => typeof value === "string")) throw new Error("突破接口返回不完整，请更新服务端后重试");
	return {
		newRealm: realm,
		message: data.message,
		unlockedRecipes,
		isNewStage: data.isNewStage,
		newStageName,
		masterStageMessages: data.masterStageMessages
	};
}

//#endregion
export { parseRealmBreakthrough, performBackendRealmBreakthrough };