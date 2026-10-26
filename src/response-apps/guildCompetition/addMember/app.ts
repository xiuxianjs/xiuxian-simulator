import { getBackendGuildCompetitionMemberCandidates } from '@src/api/bot/competition-member-candidates-query';
import { addBackendGuildCompetitionMember } from '@src/api/bot/guild-competition-actions';
import type { BackendRequestContext } from '@src/api/bot/context';

type MemberInfo = { userId: number; name: string; power: number };
type CandidateData = {
  members: MemberInfo[];
  page: number;
  totalPages: number;
  count: number;
  guildId: number;
  teamMemberIds: number[];
  availablePositions: number[];
};
type DirectAddResult = { code: 'DIRECT_ADD'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };
type MemberListResult =
  | { code: 'NO_GUILD'; data: { message: string } }
  | { code: 'NO_PERMISSION'; data: { message: string } }
  | { code: 'EMPTY_LIST'; data: { message: string } }
  | { code: 'MEMBER_LIST'; data: CandidateData }
  | { code: 'LOAD_FAILED'; data: { message: string } };
type PositionSelectResult =
  | { code: 'NO_GUILD'; data: { message: string } }
  | { code: 'NO_PERMISSION'; data: { message: string } }
  | { code: 'TEAM_NOT_FOUND'; data: { message: string } }
  | { code: 'TEAM_FULL'; data: { message: string } }
  | { code: 'POSITION_SELECT'; data: { targetUid: number; availablePositions: number[] } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export async function addMemberDirect(params: {
  uid: number;
  targetUid: number;
  pos: number;
  bid?: string;
  request?: BackendRequestContext;
}): Promise<DirectAddResult> {
  try {
    return {
      code: 'DIRECT_ADD',
      data: { message: (await addBackendGuildCompetitionMember(params.bid, params.uid, params.targetUid, params.pos, params.request!)).message }
    };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '添加失败' } };
  }
}
function candidates(bid: string | undefined, uid: number, page: number) {
  return getBackendGuildCompetitionMemberCandidates(bid, uid, page);
}
export async function fetchMemberList(params: { bid?: string; uid: number; page: number }): Promise<MemberListResult> {
  try {
    const data = await candidates(params.bid, params.uid, params.page);

    if (!data.hasGuild) {
      return { code: 'NO_GUILD', data: { message: '您还未加入任何宗门' } };
    }
    if (!data.canManage) {
      return { code: 'NO_PERMISSION', data: { message: '权限不足' } };
    }
    if (!data.hasTeam) {
      return { code: 'EMPTY_LIST', data: { message: '宗门未报名本届大比，请先报名。' } };
    }
    if (!data.members.length) {
      return { code: 'EMPTY_LIST', data: { message: '宗门内暂无可添加的成员。' } };
    }

    return { code: 'MEMBER_LIST', data };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取成员列表失败' } };
  }
}
export async function fetchPositionSelect(params: { bid?: string; uid: number; targetUid: number }): Promise<PositionSelectResult> {
  try {
    const data = await candidates(params.bid, params.uid, 1);

    if (!data.hasGuild) {
      return { code: 'NO_GUILD', data: { message: '您还未加入任何宗门' } };
    }
    if (!data.canManage) {
      return { code: 'NO_PERMISSION', data: { message: '权限不足' } };
    }
    if (!data.hasTeam) {
      return { code: 'TEAM_NOT_FOUND', data: { message: '宗门未报名本届大比，请先报名。' } };
    }
    if (!data.availablePositions.length) {
      return { code: 'TEAM_FULL', data: { message: '参赛队伍已满，无法添加新成员。' } };
    }

    return { code: 'POSITION_SELECT', data: { targetUid: params.targetUid, availablePositions: data.availablePositions } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取位置信息失败' } };
  }
}
