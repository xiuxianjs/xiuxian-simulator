import { requestGuildWorkflow } from '@src/api/bot/guild-workflow';
import type { BackendRequestContext } from '@src/api/bot/context';

type Result = { code: 'OK'; data: { message: string; stageIndex: number; spiritCrystal: number } } | { code: 'FAILED'; data: { message: string } };
export default async function App(params: { uid: number; bid?: string; stageIndex?: number | null; request: BackendRequestContext }): Promise<Result> {
  try {
    const data = await requestGuildWorkflow(
      params.bid,
      params.uid,
      { action: 'storyline_claim', ...(params.stageIndex ? { stageIndex: params.stageIndex } : {}) },
      params.request
    );

    return { code: 'OK', data: { message: `奖励领取成功，获得灵晶${data.spiritCrystal}`, stageIndex: data.stageIndex, spiritCrystal: data.spiritCrystal } };
  } catch (error) {
    return { code: 'FAILED', data: { message: error instanceof Error ? error.message : '领取宗门主线奖励失败' } };
  }
}
