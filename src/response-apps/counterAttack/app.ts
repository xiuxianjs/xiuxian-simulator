import { BackendAPIError } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';
import { counterAttackBackend, type BackendCounterAttack } from '@src/api/bot/counter-attack';

type Result =
  | { code: 'INVALID_ID'; data: { message: string } }
  | { code: 'FAIL'; data: { message: string; isEnergyInsufficient: boolean } }
  | { code: 'OK'; data: BackendCounterAttack };

export default async function App(params: { uid: number; bid?: string; robberyLogId: number; request?: BackendRequestContext }): Promise<Result> {
  const { uid, bid, robberyLogId, request } = params;

  if (!Number.isSafeInteger(robberyLogId) || robberyLogId <= 0) {
    return { code: 'INVALID_ID', data: { message: '记录ID无效' } };
  }
  try {
    return { code: 'OK', data: await counterAttackBackend(bid, uid, robberyLogId, request) };
  } catch (error) {
    const message = error instanceof BackendAPIError ? error.message : '反击失败，请稍后再试';

    return { code: 'FAIL', data: { message, isEnergyInsufficient: error instanceof BackendAPIError && error.code === 'COUNTER_ATTACK_INSUFFICIENT_QI' } };
  }
}
