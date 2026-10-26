import type { GuildCompetitionMemberCandidatesData } from '../schemas/competition-member-candidates-query';
import { requestBackend } from './client';

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, minimum = 0): value is number => Number.isSafeInteger(value) && Number(value) >= minimum;

export async function getBackendGuildCompetitionMemberCandidates(
  bid: string | undefined,
  uid: number,
  page: number
): Promise<GuildCompetitionMemberCandidatesData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseCompetitionMemberCandidates(
    await requestBackend(bid, 'get_players_id_guild_competition_team_candidates', { path: { id: uid }, query: { page } })
  );
}

export function parseCompetitionMemberCandidates(data: unknown): GuildCompetitionMemberCandidatesData {
  if (
    !record(data) ||
    typeof data.hasGuild !== 'boolean' ||
    typeof data.hasTeam !== 'boolean' ||
    typeof data.canManage !== 'boolean' ||
    !integer(data.guildId) ||
    typeof data.competitionId !== 'string' ||
    !Array.isArray(data.teamMemberIds) ||
    !Array.isArray(data.availablePositions) ||
    !Array.isArray(data.members) ||
    !integer(data.page, 1) ||
    !integer(data.totalPages, 1) ||
    !integer(data.count) ||
    data.count < data.members.length
  ) {
    throw new Error('宗门大比候选成员接口数据不完整');
  }
  for (const id of data.teamMemberIds) {
    if (!integer(id, 1)) {
      throw new Error('宗门大比候选成员接口数据不完整');
    }
  }
  for (const position of data.availablePositions) {
    if (!integer(position, 1) || position > 6) {
      throw new Error('宗门大比候选成员接口数据不完整');
    }
  }
  for (const member of data.members) {
    if (!record(member) || !integer(member.userId, 1) || typeof member.name !== 'string' || !integer(member.power)) {
      throw new Error('宗门大比候选成员接口数据不完整');
    }
  }

  return data as unknown as GuildCompetitionMemberCandidatesData;
}
