import { getBackendGuildCompetitionKnockoutCandidates } from '@src/api/bot/competition-knockout-candidates-query';

type ChallengeItem = {
  guildId: number;
  guildName: string;
  memberSlots: Array<{ position: number; userId: number; name: string } | null>;
};

type AppResult = { code: 'OK'; data: { score: number; remain: number; list: ChallengeItem[] } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid: string | undefined; uid: number }): Promise<AppResult> {
  try {
    const data = await getBackendGuildCompetitionKnockoutCandidates(params.bid, params.uid);
    const list: ChallengeItem[] = data.candidates.map(item => ({ guildId: item.guildId, guildName: item.guildName, memberSlots: item.slots }));

    return { code: 'OK', data: { score: data.score, remain: data.remaining, list } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '获取挑战列表失败' } };
  }
}
