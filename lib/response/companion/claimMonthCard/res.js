import { companionRewardResponse } from "../rewardResponse.js";
import { parseCompanionMonthCardReward } from "../../../api/bot/companion-rewards.js";

//#region src/response/companion/claimMonthCard/res.ts
var res_default = companionRewardResponse("companion.claim-month-card", "道侣月卡", parseCompanionMonthCardReward);

//#endregion
export { res_default as default };