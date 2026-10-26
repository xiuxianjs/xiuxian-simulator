import { BackendAPIError } from '@src/api';
import { endBackendSeclusion, type SeclusionEndData } from '@src/api/bot/seclusion-end';
import type { BackendRequestContext } from '@src/api/bot/context';

type SeclusionEndResult = { code: 'OK'; data: SeclusionEndData } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  load?: () => ReturnType<typeof endBackendSeclusion>;
  bid?: string;
  uid: number;
  request?: BackendRequestContext;
}): Promise<SeclusionEndResult> {
  try {
    const data = params.load ? await params.load() : await endBackendSeclusion(params.bid, params.uid, params.request);

    return { code: 'OK', data };
  } catch (error) {
    return { code: 'LOAD_FAILED', data: { message: error instanceof BackendAPIError ? error.message : '出关失败，请稍后再试' } };
  }
}
