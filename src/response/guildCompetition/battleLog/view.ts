import { formatGameTime, parseGameTime } from '@src/utils/gameTime';
import type { GuildCompetitionBattleQueryData } from '@src/api/schemas/competition-battle-query';

type BattleRecord = {
  id: number;
  attackerTeamId: number;
  defenderTeamId: number;
  winnerTeamId: number;
  stage: number;
  battleTime: Date;
  formattedTime: string;
  opponentName: string;
  isWin: boolean;
  stageName: string;
};

type AppResult =
  | { code: 'NO_GUILD'; data: { message: string } }
  | { code: 'NO_RECORDS'; data: { message: string } }
  | { code: 'OK'; data: { records: BattleRecord[]; page: number; totalPages: number; count: number } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export function competitionBattleView(data: GuildCompetitionBattleQueryData): AppResult {
  if (!data.hasGuild) {
    return { code: 'NO_GUILD', data: { message: '你还未加入宗门' } };
  }
  if (!data.hasTeams) {
    return { code: 'NO_RECORDS', data: { message: '暂无宗门大比参赛记录' } };
  }
  if (!data.count || !data.records.length) {
    return { code: 'NO_RECORDS', data: { message: '暂无战斗记录' } };
  }
  const records: BattleRecord[] = data.records.map(row => {
    const battleTime = parseGameTime(row.battleTime)?.toDate() ?? new Date(NaN);

    return {
      ...row,
      battleTime,
      formattedTime: formatGameTime(battleTime),
      opponentName: row.opponentName ?? `队伍${row.opponentTeamId}`,
      stageName: row.stage === 1 ? '淘汰赛' : row.stage === 2 ? '晋级赛' : `未知(${row.stage})`
    };
  });

  return { code: 'OK', data: { records, page: data.page, totalPages: data.totalPages, count: data.count } };
}
