import { parseDungeonFreeSweep, parseDungeonSweep } from "./dungeon-sweep.js";
import { dungeonSweepView, parseSweepCommand } from "../../response/dungeon/sweep/view.js";

//#region src/api/bot/dungeon-sweep-robot-query.ts
function dungeonSweepArguments(text) {
	const parsed = parseSweepCommand(text);
	if (parsed.ok) return {
		mode: "sweep",
		dungeonName: parsed.dungeonName,
		times: parsed.times
	};
	if (!parsed.isCommand) return { mode: "no_match" };
	if (parsed.message === "扫荡次数仅支持 1、5、10") return { mode: "invalid-times" };
	if (parsed.message === "请输入秘境名称") return { mode: "empty-name" };
	return { mode: "usage" };
}
function parseRobotDungeonSweep(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("秘境扫荡响应不完整");
	const result = value;
	if (result.outcome === "no_match") return { outcome: "no_match" };
	if (result.outcome !== "result") throw new Error("秘境扫荡响应不完整");
	return {
		outcome: "result",
		data: dungeonSweepView(parseDungeonSweep(result.data))
	};
}
function parseRobotDungeonFreeSweep(value) {
	const data = parseDungeonFreeSweep(value);
	return {
		...data,
		sweptDungeons: data.sweptDungeons.map(dungeonSweepView)
	};
}

//#endregion
export { dungeonSweepArguments, parseRobotDungeonFreeSweep, parseRobotDungeonSweep };