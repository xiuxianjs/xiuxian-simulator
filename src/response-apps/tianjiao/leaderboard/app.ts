import { presentTianjiaoLeaderboard } from '@src/api/bot/tianjiao-robot-query';
import { getBackendTianjiaoLeaderboard } from '@src/api/bot/tianjiao-leaderboard-queries';

export type TianjiaoLeaderboardAppResult =
  | { code: 'NO_MATCH' }
  | { code: 'LOCKED'; message: string }
  | {
      code: 'SUCCESS';
      data: {
        stageName: string;
        myRank: number | null;
        attemptsLeft: number;
        suggestedTarget: number | null;
        canChallenge: boolean;
        requiredText: string;
        entries: { text: string; challengeRank: number | null; challengeLabel: '挑战' | '占位' }[];
      };
    };

export default async function App(params: { uid: number; bid?: string; messageText: string }): Promise<TianjiaoLeaderboardAppResult> {
  const regex = /^(!|！|\/|#|＃)?(查看)?(登天梯|天骄榜)$/;

  if (!regex.test(params.messageText || '')) {
    return { code: 'NO_MATCH' };
  }

  const access = await getBackendTianjiaoLeaderboard(params.bid, params.uid);

  return presentTianjiaoLeaderboard(access);
}
