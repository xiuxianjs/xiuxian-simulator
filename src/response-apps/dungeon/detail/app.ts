import { getBackendDungeonDetailCommand } from '@src/api/bot/query-presentation';
import type { BackendRequestContext } from '@src/api/bot/context';
import { dungeonDetailView, type DetailData } from '@src/response/dungeon/detail/view';
export { buildDropDetailCommand, formatDropProbability } from '@src/response/dungeon/detail/view';
export type { DetailData, DropDetail } from '@src/response/dungeon/detail/view';

type DetailResult = { code: 'OK'; data: DetailData } | { code: 'FAIL'; data: { message: string } };
export default async function App(params: {
  bid?: string;
  uid: number;
  dungeonName: string;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<DetailResult> {
  try {
    const item = await getBackendDungeonDetailCommand(params.bid, params.uid, params.dungeonName, params.messageText, params.request);

    return { code: 'OK', data: dungeonDetailView(item) };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof Error ? error.message : '秘境详情读取失败' } };
  }
}
