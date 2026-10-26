import type { BackendRequestContext } from '@src/api/bot/context';
import { requestGuildWorkflow } from '@src/api/bot/guild-workflow';

type AppResult =
  | { code: 'RESIGN_CONFIRM'; data: { message: string } }
  | { code: 'RESIGN_DONE'; data: { message: string } }
  | { code: 'DEMOTE_NO_ROLE'; data: { message: string } }
  | { code: 'DEMOTE_DONE'; data: { message: string } }
  | { code: 'FAIL'; data: { message: string } }
  | { code: 'OK'; data: { members: any[]; operatorRole: string; operatorUserId: number; isDeputy: boolean } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  targetUid: number | null;
  targetBid?: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<AppResult> {
  try {
    const workflow = await requestGuildWorkflow(
      params.bid,
      params.uid,
      { action: 'role_resign', targetUserId: params.targetUid ?? undefined, targetBid: params.targetBid },
      params.request,
      params.repeatCommand
    );

    if (workflow.kind === 'resign') {
      const result = workflow.result;

      return { code: result.outcome === 'confirmation_required' ? 'RESIGN_CONFIRM' : 'RESIGN_DONE', data: { message: result.message } };
    }
    if (workflow.kind === 'demote') {
      return { code: 'DEMOTE_DONE', data: { message: workflow.result.message } };
    }
    if (workflow.kind === 'role_missing') {
      return { code: 'DEMOTE_NO_ROLE', data: { message: '职位配置异常，请联系运营' } };
    }
    if (workflow.kind !== 'options') {
      throw new Error('卸任操作响应不完整');
    }
    const data = workflow.options;

    if (data.membershipStatus !== 'joined' || !data.operatorUserId || !data.operatorRoleName) {
      return { code: 'FAIL', data: { message: '您不在宗门中' } };
    }
    const members = data.members.map(member => ({
      userId: member.userId,
      userName: member.userExists ? `${member.name}（${member.realmName ?? '未知'}）` : '未知',
      roleName: member.roleName ?? '弟子',
      isDeputy: member.isDeputy,
      canDemote: member.canDemote
    }));

    return { code: 'OK', data: { members, operatorRole: data.operatorRoleName, operatorUserId: data.operatorUserId, isDeputy: data.isDeputy } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '操作失败' } };
  }
}
