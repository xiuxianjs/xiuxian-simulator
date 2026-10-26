import { challengeBackendDemonTower } from '@src/api/bot/demon-tower-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
import type { DemonTowerChallengeResult } from '@src/api/schemas/demon-tower-challenge';

type ChallengeAppResult =
  { code: 'INVALID_STAR'; data: { message: string } } | { code: 'OK'; data: DemonTowerChallengeResult } | { code: 'FAIL'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string; star: number; request?: BackendRequestContext }): Promise<ChallengeAppResult> {
  if (!Number.isInteger(params.star) || ![1, 2, 3].includes(params.star)) {
    return { code: 'INVALID_STAR', data: { message: '星级只能是 1、2 或 3' } };
  }

  try {
    return { code: 'OK', data: await challengeBackendDemonTower(params.bid, params.uid, params.star, params.request) };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof Error ? error.message : '妖塔挑战失败' } };
  }
}
