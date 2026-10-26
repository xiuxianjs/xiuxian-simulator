import { requestGuildWorkflow } from '@src/api/bot/guild-workflow';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_GUILD } from '@src/constants/messages';

export default async function Query(params: { bid?: string; uid: number; request?: BackendRequestContext }) {
  try {
    const data = await requestGuildWorkflow(params.bid, params.uid, { action: 'resignation_options' }, params.request);

    if (data.membershipStatus !== 'joined') {
      const message =
        data.membershipStatus === 'not_joined'
          ? MSG_GUILD.NOT_JOINED
          : data.membershipStatus === 'guild_missing'
            ? MSG_GUILD.GUILD_INFO_NOT_FOUND
            : data.membershipStatus === 'members_missing'
              ? MSG_GUILD.MEMBER_NOT_FOUND
              : '您不在宗门中';

      return { code: 'FAIL' as const, data: { message } };
    }

    return {
      code: 'OK' as const,
      data: {
        members: data.members.map(row => ({
          ...row,
          roleName: row.roleName ?? '弟子',
          userName: row.userExists ? `${row.name}（${row.realmName ?? '未知'}）` : '未知'
        })),
        operatorRole: data.operatorRoleName ?? '弟子',
        operatorUserId: data.operatorUserId!,
        isDeputy: data.isDeputy
      }
    };
  } catch (error: any) {
    return { code: 'LOAD_FAILED' as const, data: { message: error?.message ?? '操作失败' } };
  }
}
