import { parseWorldBossChallenge } from "./world-boss-challenge.js";
import { worldBossChallengeView } from "../../response/worldBoss/challenge/view.js";

//#region src/api/bot/world-boss-challenge-robot-query.ts
function worldBossChallengeArguments(text) {
	const modeText = text.trim().match(/^(!|！|\/|#|＃)?挑战凶兽(?:\s+(.+))?$/)?.[2]?.trim();
	const all = modeText === "全部" || modeText === "一键" || modeText === "打完" || modeText === "剩余";
	return { mode: modeText && !all ? "usage" : all ? "all" : "single" };
}
function parseRobotWorldBossChallenge(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("凶兽挑战响应不完整");
	const row = value;
	if (row.outcome === "usage") return { outcome: "usage" };
	if (row.outcome !== "result" || row.mode !== "single" && row.mode !== "all") throw new Error("凶兽挑战响应不完整");
	const all = row.mode === "all";
	return {
		outcome: "result",
		data: worldBossChallengeView(parseWorldBossChallenge(row.data, all), all)
	};
}

//#endregion
export { parseRobotWorldBossChallenge, worldBossChallengeArguments };