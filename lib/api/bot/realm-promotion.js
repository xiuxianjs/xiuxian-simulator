//#region src/api/bot/realm-promotion.ts
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("晋级接口返回不完整，请更新服务端后重试");
	return value;
}
function stringList(value) {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}
function parseBackendRealmPromotion(data) {
	const value = record(data);
	if (value.capReached === true) {
		if (typeof value.capRealmName !== "string") throw new Error("晋级接口返回的上限信息不完整");
		return {
			success: false,
			message: "",
			capReached: true,
			capRealmName: value.capRealmName,
			unlockedRecipes: [],
			masterStageMessages: []
		};
	}
	const unlockedRecipes = value.unlockedRecipes ?? [];
	const masterStageMessages = value.masterStageMessages ?? [];
	if (typeof value.success !== "boolean" || typeof value.message !== "string" || !stringList(unlockedRecipes) || !stringList(masterStageMessages)) throw new Error("晋级接口返回不完整，请更新服务端后重试");
	const result = {
		success: value.success,
		message: value.message,
		capReached: false,
		capRealmName: "",
		unlockedRecipes,
		masterStageMessages
	};
	if (value.newRealm !== void 0) {
		const realm = record(value.newRealm);
		if (typeof realm.name !== "string" || ![
			"spiritualPower",
			"speed",
			"magicAttack",
			"physicalAttack",
			"magicDefense",
			"physicalDefense",
			"experienceLimit"
		].every((key) => typeof realm[key] === "number" && Number.isFinite(realm[key]))) throw new Error("晋级接口返回的新境界不完整");
		result.newRealm = realm;
	}
	if (value.tribulation !== void 0) {
		const tribulation = record(value.tribulation);
		if (typeof tribulation.name !== "string" || !["totalLayers", "passedLayers"].every((key) => typeof tribulation[key] === "number") || typeof tribulation.summary !== "string") throw new Error("晋级接口返回的渡劫信息不完整");
		result.tribulation = tribulation;
	}
	return result;
}

//#endregion
export { parseBackendRealmPromotion };