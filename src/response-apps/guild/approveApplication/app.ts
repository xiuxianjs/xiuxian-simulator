import { decideBackendGuildApplication } from '@src/api/bot/guild-membership-mutations';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult =
  | { code: 'NO_GUILD'; data: { message: string } }
  | { code: 'OK'; data: { success: boolean; message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  applicantUid: number;
  request?: BackendRequestContext;
  repeatCommand?: string;
}): Promise<AppResult> {
  try {
    const result = await decideBackendGuildApplication(params.bid, params.uid, params.applicantUid, true, params.request, params.repeatCommand);

    return { code: 'OK', data: { success: result.outcome === 'approved', message: result.message } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '审核操作失败' } };
  }
}
