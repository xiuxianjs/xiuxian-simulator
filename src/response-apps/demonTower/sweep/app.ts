import { sweepBackendDemonTower } from '@src/api/bot/demon-tower-actions';
import type { BackendRequestContext } from '@src/api/bot/context';

type SweepData = {
  layersSwept: number;
  totalSpiritStone: number;
  totalScore: number;
  cumulativeStars: number;
  milestonesTriggered: Array<{ id: number; stars: number; score: number }>;
  nextLayer: number;
  buffsToSelect: number;
  availableBuffs: Array<{ key: string; label: string; cnKey: string }>;
};

type SweepResult = { code: 'OK'; data: SweepData } | { code: 'FAIL'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string; request?: BackendRequestContext }): Promise<SweepResult> {
  try {
    return { code: 'OK', data: await sweepBackendDemonTower(params.bid, params.uid, params.request) };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof Error ? error.message : '妖塔扫荡失败，请稍后再试' } };
  }
}
