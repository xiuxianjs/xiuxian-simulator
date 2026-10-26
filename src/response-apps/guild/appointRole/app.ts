import { requestGuildWorkflow } from '@src/api/bot/guild-workflow';
import { getBackendGuildRoleOptions } from '@src/api/bot/guild-role-options-queries';
import type { BackendRequestContext } from '@src/api/bot/context';

type AppResult =
  | { code: 'NO_MATCH'; data: { roleList: string } }
  | { code: 'NO_ROLE'; data: { message: string } }
  | { code: 'OK'; data: { message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };
export default async function App(params: {
  bid?: string;
  uid: number;
  roleName: string | null;
  targetUid: number | null;
  targetBid?: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<AppResult> {
  try {
    if (!params.roleName || (!params.targetUid && !params.targetBid)) {
      const facts = await getBackendGuildRoleOptions(params.bid, params.uid);

      return { code: 'NO_MATCH', data: { roleList: facts.roles.map(role => `${role.name}（ID:${role.id}）`).join('、') } };
    }
    const result = await requestGuildWorkflow(
      params.bid,
      params.uid,
      { action: 'role_appoint', roleName: params.roleName, targetUserId: params.targetUid ?? undefined, targetBid: params.targetBid },
      params.request,
      params.repeatCommand
    );

    if ('roles' in result) {
      return { code: 'NO_MATCH', data: { roleList: result.roles.map(role => `${role.name}（ID:${role.id}）`).join('、') } };
    }
    if (!('message' in result)) {
      return { code: 'NO_ROLE', data: { message: `职位【${params.roleName}】不存在` } };
    }

    return { code: 'OK', data: { message: result.message } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '任命失败' } };
  }
}
