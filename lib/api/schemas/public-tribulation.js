import { formatGameDate } from "../../utils/gameTime.js";

//#region src/api/schemas/public-tribulation.ts
function parsePublicTribulationEvent(data) {
	if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("公开渡劫接口返回不完整");
	const value = data;
	const positive = (key) => Number.isSafeInteger(value[key]) && Number(value[key]) > 0;
	if (![
		"eventId",
		"playerId",
		"targetStage",
		"requiredAttempts"
	].every(positive) || ![
		"name",
		"currentRealm",
		"targetRealm",
		"tribulationName"
	].every((key) => typeof value[key] === "string") || !(value.status === "opened" ? ["opensAt"] : ["opensAt", "deadline"]).every((key) => typeof value[key] === "string" && Number.isFinite(Date.parse(value[key]))) || typeof value.status !== "string" || ![
		"opened",
		"preparing",
		"charging",
		"succeeded",
		"failed",
		"expired",
		"cancelled",
		"evaded"
	].includes(value.status) || typeof value.interactionOpen !== "boolean" || value.disruptionKarmaEnabled !== void 0 && typeof value.disruptionKarmaEnabled !== "boolean" || value.interactionOpen && value.status !== "charging" || value.status === "charging" && (typeof value.strikeAt !== "string" || !Number.isFinite(Date.parse(value.strikeAt))) || value.canStart !== false) throw new Error("公开渡劫接口返回不完整或包含未支持的互动状态");
	return {
		eventId: value.eventId,
		playerId: value.playerId,
		name: value.name,
		currentRealm: value.currentRealm,
		targetRealm: value.targetRealm,
		targetStage: value.targetStage,
		tribulationName: value.tribulationName,
		requiredAttempts: value.requiredAttempts,
		status: value.status,
		opensAt: value.opensAt,
		...value.deadline !== void 0 ? { deadline: value.deadline } : {},
		...value.strikeAt !== void 0 ? { strikeAt: value.strikeAt } : {},
		...value.participationOpen === true && value.interactionOpen === true ? { participationOpen: true } : {},
		interactionOpen: value.interactionOpen,
		...value.disruptionKarmaEnabled === true ? { disruptionKarmaEnabled: true } : {},
		...value.disruption !== void 0 ? { disruption: parseDisruptionSummary(value.disruption) } : {},
		canStart: false
	};
}
function parsePublicTribulationList(data) {
	if (!Array.isArray(data)) throw new Error("公开渡劫列表返回不完整");
	return data.map(parsePublicTribulationEvent);
}
function parseDisruptionSummary(data) {
	if (!data || typeof data !== "object") throw new Error("捣乱数据不完整");
	const v = data;
	if (!Number.isSafeInteger(v.count) || Number(v.count) < 0 || !Number.isSafeInteger(v.attackBonusPercent) || Number(v.attackBonusPercent) !== Math.min(Number(v.count), 10)) throw new Error("捣乱数据不完整");
	return {
		count: Number(v.count),
		attackBonusPercent: Number(v.attackBonusPercent)
	};
}
function parseDisruptionResult(data, eventId) {
	if (!data || typeof data !== "object") throw new Error("捣乱结果不完整");
	const v = data;
	if (v.eventId !== eventId || v.participated !== true) throw new Error("捣乱事件不一致");
	return {
		eventId,
		participated: true,
		summary: parseDisruptionSummary(v.summary),
		...v.reward !== void 0 ? { reward: parseParticipationReward(v.reward) } : {}
	};
}
function parseParticipationReward(data) {
	if (!data || typeof data !== "object") throw new Error("渡劫感悟回执不完整");
	const v = data;
	if (![
		"baseExperience",
		"creditedExperience",
		"dailyRewarded",
		"dailyLimit"
	].every((k) => Number.isSafeInteger(v[k]) && Number(v[k]) >= 0) || v.dailyLimit !== 3 || Number(v.dailyRewarded) > Number(v.dailyLimit) || Number(v.creditedExperience) > Number(v.baseExperience) || typeof v.rewardDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.rewardDate) || typeof v.repeated !== "boolean" || ![
		"granted",
		"daily_limit",
		"experience_cap",
		"no_eligible_dungeon"
	].includes(String(v.reason)) || (v.reason === "granted" ? Number(v.creditedExperience) <= 0 : v.creditedExperience !== 0)) throw new Error("渡劫感悟回执不完整");
	return {
		baseExperience: Number(v.baseExperience),
		creditedExperience: Number(v.creditedExperience),
		dailyRewarded: Number(v.dailyRewarded),
		dailyLimit: Number(v.dailyLimit),
		rewardDate: v.rewardDate,
		reason: v.reason,
		repeated: v.repeated
	};
}
function parseParticipationResult(data, eventId) {
	if (!data || typeof data !== "object") throw new Error("渡劫参与回执不完整");
	const v = data;
	if (v.eventId !== eventId || v.participated !== true) throw new Error("渡劫参与事件不一致");
	return {
		eventId,
		participated: true,
		reward: parseParticipationReward(v.reward)
	};
}
function participationRewardLines(r) {
	return [r.reason === "granted" ? r.repeated ? `本场已获得修为 +${r.creditedExperience}，本次未重复发放。` : `参与感悟：修为 +${r.creditedExperience}，已即时到账。` : r.reason === "daily_limit" ? "本次未获修为：当日3场奖励已领满，仍可参与。" : r.reason === "experience_cap" ? "本次未获修为：已达当前境界修为存储上限。" : "本次未获修为：本场暂无可获得的感悟修为。", `今日感悟 ${r.dailyRewarded}/${r.dailyLimit}场 · ${formatGameDate(r.rewardDate)}`];
}

//#endregion
export { parseDisruptionResult, parseDisruptionSummary, parseParticipationResult, parseParticipationReward, parsePublicTribulationEvent, parsePublicTribulationList, participationRewardLines };