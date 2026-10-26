import { getCommandErrorMessage } from "../../../utils/commandError.js";
import { BackendAPIError } from "../../../api/bot/client.js";
import { sweepBackendDungeon, sweepBackendFreeDungeons } from "../../../api/bot/dungeon-sweep.js";
import { dungeonSweepView, parseSweepCommand } from "../../../response/dungeon/sweep/view.js";

//#region src/response-apps/dungeon/sweep/app.ts
function failureMessage(error) {
	if (error instanceof BackendAPIError && [
		"SDK_TIMEOUT",
		"SDK_NETWORK_ERROR",
		"SDK_ABORTED"
	].includes(error.code)) return error.message;
	return getCommandErrorMessage(error);
}
async function executeSweep(params) {
	try {
		return {
			code: "OK",
			data: dungeonSweepView(await sweepBackendDungeon(params.bid, params.uid, params.dungeonName, params.times, params.request, params.messageText))
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: {
				message: failureMessage(error),
				isEnergyInsufficient: error instanceof BackendAPIError && error.code === "DUNGEON_SWEEP_INSUFFICIENT_ENERGY"
			}
		};
	}
}
async function executeFreeDungeonSweeps(params) {
	try {
		const result = await sweepBackendFreeDungeons(params.bid, params.uid, params.request, params.messageText);
		return {
			code: "OK",
			data: {
				skippedDungeons: result.skippedDungeons,
				sweptDungeons: result.sweptDungeons.map(dungeonSweepView),
				totalTimes: result.totalTimes,
				totalExp: result.totalExp,
				totalSpiritCost: result.totalSpiritCost
			}
		};
	} catch (error) {
		return {
			code: "FAIL",
			data: {
				message: failureMessage(error),
				isEnergyInsufficient: error instanceof BackendAPIError && error.code === "DUNGEON_SWEEP_INSUFFICIENT_ENERGY"
			}
		};
	}
}

//#endregion
export { executeFreeDungeonSweeps, executeSweep, parseSweepCommand };