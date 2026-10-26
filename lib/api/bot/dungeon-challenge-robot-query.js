import { parseDungeonCommand } from "../../response/dungeon/enter/command.js";
import { parseDungeonChallenge } from "./dungeon-challenge.js";

//#region src/api/bot/dungeon-challenge-robot-query.ts
function dungeonChallengeArguments(text) {
	const parsed = parseDungeonCommand(text);
	if (parsed.ok) return {
		mode: "challenge",
		dungeonName: parsed.dungeonName
	};
	return { mode: parsed.isCommand ? "usage" : "no_match" };
}
function parseRobotDungeonChallenge(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("秘境挑战响应不完整");
	const row = value;
	if (row.outcome === "no_match") return { outcome: "no_match" };
	if (row.outcome !== "result") throw new Error("秘境挑战响应不完整");
	return {
		outcome: "result",
		data: parseDungeonChallenge(row.data)
	};
}

//#endregion
export { dungeonChallengeArguments, parseRobotDungeonChallenge };