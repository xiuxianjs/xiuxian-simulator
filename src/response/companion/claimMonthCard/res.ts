import { parseCompanionMonthCardReward } from '@src/api/bot/companion-rewards';
import { companionRewardResponse } from '../rewardResponse';

export default companionRewardResponse('companion.claim-month-card', '道侣月卡', parseCompanionMonthCardReward);
