import { kickBackendGuildMember } from '@src/api/bot/guild-member-lifecycle';
import type { BackendRequestContext } from '@src/api/bot/context';
import { getBackendGuildRoleOptions } from '@src/api/bot/guild-role-options-queries';

type AppResult =
  | { code: 'KICK_DONE'; data: { message: string } }
  | { code: 'FAIL'; data: { message: string } }
  | { code: 'OK'; data: { members: Array<{ userId: number; roleName: string; userName: string }> } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  targetUid: number | null;
  request?: BackendRequestContext;
  repeatCommand?: string;
}): Promise<AppResult> {
  try {
    if (params.targetUid !== null) {
      const result = await kickBackendGuildMember(params.bid, params.uid, params.targetUid, params.request, params.repeatCommand);

      return { code: 'KICK_DONE', data: { message: result.message } };
    }
    const facts = await getBackendGuildRoleOptions(params.bid, params.uid);

    if (facts.membershipStatus !== 'joined') {
      return { code: 'FAIL', data: { message: '您不在宗门中' } };
    }
    const members = facts.kickableMembers.map(member => ({
      userId: member.userId,
      roleName: member.roleName ?? '弟子',
      userName: member.userExists ? `${member.name}（${member.realmName ?? '未知'}）` : '未知'
    }));

    return { code: 'OK', data: { members } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '操作失败' } };
  }
}
