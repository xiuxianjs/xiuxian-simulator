import { formatRealmRequirementDetails } from "../../../utils/realmRequirements.js";
import { executeBackendPromotionCommand } from "../../../api/bot/promotion-command.js";
import { tribulationPreparationPanel } from "../../tribulation/app.js";
import { logger } from "alemonjs";

//#region src/response-apps/promotion/perform/app.ts
async function App(params) {
	try {
		const command = params.load ? await params.load() : await executeBackendPromotionCommand(params.bid, params.uid, params.request);
		if (command.mode === "preparation") return {
			code: "TRIBULATION",
			data: tribulationPreparationPanel(command.overview)
		};
		const result = command.result;
		if (result.capReached) return {
			code: "CAP_REACHED",
			data: { realmName: result.capRealmName }
		};
		if (!result.success) {
			const requirementLines = command.overview ? formatRealmRequirementDetails(command.overview.promotion, true) : [];
			return {
				code: "FAILED",
				uid: params.uid,
				data: {
					message: result.message,
					tribulation: result.tribulation,
					requirementLines
				}
			};
		}
		return {
			code: "SUCCESS",
			data: {
				message: result.message,
				tribulation: result.tribulation && result.tribulation.totalLayers > 0 ? {
					name: result.tribulation.name,
					totalLayers: result.tribulation.totalLayers,
					passedLayers: result.tribulation.passedLayers
				} : void 0,
				newRealm: result.newRealm,
				unlockedRecipes: result.unlockedRecipes,
				masterStageMessages: result.masterStageMessages
			}
		};
	} catch (error) {
		logger.error("晋级失败:", error);
		return { code: "ERROR" };
	}
}

//#endregion
export { App as default };