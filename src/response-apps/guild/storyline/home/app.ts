import { getBackendGuildStorylineHome, type GuildStorylineHomeView } from '@src/api/bot/guild-storyline-actions';

type Result =
  | { code: 'NO_GUILD' | 'LOAD_FAILED'; data: { message: string } }
  | {
      code: 'ALL_CLEARED' | 'OK';
      data: GuildStorylineHomeView & { guildId: number; claimableStages: number[] };
    };
export default async function App(params: { uid: number; bid?: string }): Promise<Result> {
  try {
    const data = await getBackendGuildStorylineHome(params.bid, params.uid);

    return {
      code: data.home.allCleared ? 'ALL_CLEARED' : 'OK',
      data: {
        guildId: data.guildId,
        ...data.home,
        claimableStages: data.claimableStages
      }
    };
  } catch (error) {
    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '加载宗门主线信息失败' } };
  }
}
