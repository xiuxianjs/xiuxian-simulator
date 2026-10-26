import {
  getBackendGuildBattleTraining,
  postBackendGuildBattleTraining,
  type GuildBattleTrainingBranch,
  type GuildBattleTrainingKey
} from '@src/api/bot/guild-battle-training';
import type { BackendRequestContext } from '@src/api/bot/context';

type Result =
  | { code: 'NO_GUILD'; data: { message: string } }
  | { code: 'FAILED'; data: { message: string } }
  | { code: 'GUIDE'; data: Awaited<ReturnType<typeof getBackendGuildBattleTraining>> }
  | { code: 'OK'; data: Awaited<ReturnType<typeof postBackendGuildBattleTraining>> };

export default async function App(params: {
  uid: number;
  bid?: string;
  branch?: GuildBattleTrainingBranch;
  key?: GuildBattleTrainingKey;
  request?: BackendRequestContext;
}): Promise<Result> {
  try {
    if (!params.branch || !params.key) {
      return { code: 'GUIDE', data: await getBackendGuildBattleTraining(params.bid, params.uid) };
    }

    return { code: 'OK', data: await postBackendGuildBattleTraining(params.bid, params.uid, params.branch, params.key, params.request) };
  } catch (error: any) {
    const message = error?.message ?? '宗门战备操作失败';

    return { code: /尚未加入宗门|还没有加入宗门/.test(message) ? 'NO_GUILD' : 'FAILED', data: { message } };
  }
}
