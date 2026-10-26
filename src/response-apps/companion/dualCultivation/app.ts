import { BackendAPIError } from '@src/api';
import { dualCultivateBackendCompanion } from '@src/api/bot/companion-relationship-actions';
import type { BackendRequestContext } from '@src/api/bot/context';

type Result = { code: 'OK'; data: { expGained: number; partnerExpGained: number; tongxinGained: number } } | { code: 'FAIL'; data: { message: string } };

/** The robot forwards the command and renders the Go settlement. */
export default async function App(params: { uid: number; bid?: string; messageText?: string; request?: BackendRequestContext }): Promise<Result> {
  try {
    const result = await dualCultivateBackendCompanion(params.bid, params.uid, params.request, params.messageText);

    return { code: 'OK', data: { expGained: result.experienceGained, partnerExpGained: result.experienceGained, tongxinGained: result.tongxinGained } };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof BackendAPIError ? error.message : '双修失败，请稍后再试' } };
  }
}
