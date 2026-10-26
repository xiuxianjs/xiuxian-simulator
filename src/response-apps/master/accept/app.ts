import { acceptBackendMaster, listBackendMasterProposals } from '@src/api/bot/master-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
type Proposal = { fromUserId: number; fromName: string; fromRealm: string; createdAt: string | Date };
type Result = { code: 'LIST'; data: { received: Proposal[] } } | { code: 'OK'; data: { message: string } } | { code: 'FAIL'; data: { message: string } };
export default async function App(params: {
  bid?: string;
  uid: number;
  discipleArg?: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  try {
    if (!params.discipleArg) {
      return { code: 'LIST', data: { received: await listBackendMasterProposals(params.bid, params.uid) } };
    }

    return { code: 'OK', data: await acceptBackendMaster(params.bid, params.uid, params.discipleArg, params.request, params.repeatCommand) };
  } catch (error: any) {
    return { code: 'FAIL', data: { message: error?.message ?? '同意拜师失败' } };
  }
}
