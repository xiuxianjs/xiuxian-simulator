import { parseCompanionDailyReward } from "../../../api/bot/companion-rewards.js";
import { companionRewardResponse } from "../rewardResponse.js";

//#region src/response/companion/claimDaily/res.ts
var res_default = companionRewardResponse("companion.claim-daily", "道侣签到", parseCompanionDailyReward);

//#endregion
export { res_default as default };