import { parseCompanionDailyReward } from '@src/api/bot/companion-rewards';
import { companionRewardResponse } from '../rewardResponse';

export default companionRewardResponse('companion.claim-daily', '道侣签到', parseCompanionDailyReward);
