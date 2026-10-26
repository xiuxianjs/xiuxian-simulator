import { parseGuildBattleTrainingState, parseGuildBattleTrainingUpgrade } from "./guild-battle-training.js";

//#region src/api/bot/guild-training-robot-query.ts
function parseRobotGuildTraining(value, branch, key) {
	if (branch && key) return {
		code: "OK",
		data: parseGuildBattleTrainingUpgrade(value, branch, key)
	};
	return {
		code: "GUIDE",
		data: parseGuildBattleTrainingState(value)
	};
}

//#endregion
export { parseRobotGuildTraining };