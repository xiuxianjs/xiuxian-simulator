import { getBackendGuildRoleOptions } from '@src/api/bot/guild-role-options-queries';
import { MSG_GUILD } from '@src/constants/messages';

type AppResult =
  | { code: 'FAIL'; data: { message: string } }
  | {
      code: 'OK';
      data: {
        guildName: string;
        members: Array<{ userId: number; userName: string; roleName: string; isDeputy: boolean; appointableRoles: Array<{ id: number; name: string }> }>;
        allRoles: Array<{ id: number; name: string }>;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number }): Promise<AppResult> {
  try {
    const result = await getBackendGuildRoleOptions(params.bid, params.uid);

    if (result.membershipStatus !== 'joined') {
      const messages = {
        not_joined: MSG_GUILD.NOT_JOINED,
        guild_missing: MSG_GUILD.GUILD_INFO_NOT_FOUND,
        members_missing: MSG_GUILD.MEMBER_NOT_FOUND
      };

      return { code: 'FAIL', data: { message: messages[result.membershipStatus] } };
    }
    const members = result.members.map(member => ({
      userId: member.userId,
      userName: member.userExists ? `${member.name}（${member.realmName ?? '未知'}）` : '未知',
      roleName: member.roleName ?? '弟子',
      isDeputy: member.isDeputy,
      appointableRoles: member.appointableRoles
    }));

    return { code: 'OK', data: { guildName: result.guildName, members, allRoles: result.roles } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取数据失败' } };
  }
}
