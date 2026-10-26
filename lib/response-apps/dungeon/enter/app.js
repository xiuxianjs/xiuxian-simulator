import { parseDungeonCommand } from "../../../response/dungeon/enter/command.js";
import { challengeBackendDungeon } from "../../../api/bot/dungeon-challenge.js";

//#region src/response-apps/dungeon/enter/app.ts
async function executeDungeon(input) {
	try {
		return {
			code: "OK",
			data: await challengeBackendDungeon(input.bid, input.uid, input.dungeonName, input.request, input.messageText)
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: { message: error instanceof Error ? error.message : "秘境挑战失败" }
		};
	}
}

//#endregion
export { executeDungeon, parseDungeonCommand };