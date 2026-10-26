import { claimBackendMasterTitle } from '@src/api/bot/master-actions';
import { BackendAPIError } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';
export type ClaimMasterTitleResult =
  { code: 'OK' } | { code: 'TITLE_NOT_FOUND' } | { code: 'NOT_ELIGIBLE' } | { code: 'ALREADY_CLAIMED' } | { code: 'LOCK_FAIL' } | { code: 'ERROR' };
export default async function App(params: { bid?: string; uid: number; request?: BackendRequestContext }): Promise<ClaimMasterTitleResult> {
  try {
    await claimBackendMasterTitle(params.bid, params.uid, params.request);

    return { code: 'OK' };
  } catch (error) {
    if (!(error instanceof BackendAPIError)) {
      return { code: 'ERROR' };
    }
    if (error.code === 'MASTER_TITLE_ALREADY_CLAIMED') {
      return { code: 'ALREADY_CLAIMED' };
    }
    if (error.code === 'MASTER_TITLE_NOT_ELIGIBLE') {
      return { code: 'NOT_ELIGIBLE' };
    }
    if (error.code === 'MASTER_TITLE_NOT_FOUND') {
      return { code: 'TITLE_NOT_FOUND' };
    }
    if (error.code === 'IDEMPOTENCY_IN_PROGRESS') {
      return { code: 'LOCK_FAIL' };
    }

    return { code: 'ERROR' };
  }
}
