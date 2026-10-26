import { parseWorldBossInfo } from "./world-boss-info-queries.js";
import { parseWorldBossRanking } from "./world-boss-ranking-queries.js";
import { parseWorldBossRewards } from "./world-boss-rewards-queries.js";
import { worldBossInfoView, worldBossRankingView, worldBossRewardsView } from "../../response/worldBoss/view.js";

//#region src/api/bot/world-boss-robot-query.ts
function parseRobotWorldBossInfo(value) {
	return worldBossInfoView(parseWorldBossInfo(value));
}
function parseRobotWorldBossRanking(value) {
	const facts = parseWorldBossRanking(value);
	if (!facts.available) throw new Error(facts.unavailableMessage);
	return worldBossRankingView(facts);
}
function parseRobotWorldBossRewards(value) {
	const facts = parseWorldBossRewards(value);
	if (!facts.available || !facts.config) throw new Error(facts.unavailableMessage);
	return worldBossRewardsView(facts);
}

//#endregion
export { parseRobotWorldBossInfo, parseRobotWorldBossRanking, parseRobotWorldBossRewards };