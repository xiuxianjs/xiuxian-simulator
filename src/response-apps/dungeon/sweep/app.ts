import { sweepBackendDungeon, sweepBackendFreeDungeons, type DungeonSweepSkipped } from '@src/api/bot/dungeon-sweep';
import { BackendAPIError } from '@src/api/bot/client';
import { getCommandErrorMessage } from '@src/utils/commandError';
import { dungeonSweepView, type SweepData } from '@src/response/dungeon/sweep/view';
export { parseSweepCommand } from '@src/response/dungeon/sweep/view';
import type { BackendRequestContext } from '@src/api/bot/context';

type SweepResult = { code: 'OK'; data: SweepData } | { code: 'FAIL'; data: { message: string; isEnergyInsufficient: boolean } };
type FreeSweepResult =
  | { code: 'OK'; data: { skippedDungeons: DungeonSweepSkipped[]; sweptDungeons: SweepData[]; totalTimes: number; totalExp: number; totalSpiritCost: number } }
  | { code: 'FAIL'; data: { message: string; isEnergyInsufficient: boolean } };
function failureMessage(error: unknown): string {
  if (error instanceof BackendAPIError && ['SDK_TIMEOUT', 'SDK_NETWORK_ERROR', 'SDK_ABORTED'].includes(error.code)) {
    return error.message;
  }

  return getCommandErrorMessage(error);
}

export async function executeSweep(params: {
  bid: string | undefined;
  uid: number;
  dungeonName: string;
  times: number;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<SweepResult> {
  try {
    return {
      code: 'OK',
      data: dungeonSweepView(await sweepBackendDungeon(params.bid, params.uid, params.dungeonName, params.times, params.request, params.messageText))
    };
  } catch (error) {
    const message = failureMessage(error);

    return { code: 'FAIL', data: { message, isEnergyInsufficient: error instanceof BackendAPIError && error.code === 'DUNGEON_SWEEP_INSUFFICIENT_ENERGY' } };
  }
}
export async function executeFreeDungeonSweeps(params: {
  bid: string | undefined;
  uid: number;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<FreeSweepResult> {
  try {
    const result = await sweepBackendFreeDungeons(params.bid, params.uid, params.request, params.messageText);

    return {
      code: 'OK',
      data: {
        skippedDungeons: result.skippedDungeons,
        sweptDungeons: result.sweptDungeons.map(dungeonSweepView),
        totalTimes: result.totalTimes,
        totalExp: result.totalExp,
        totalSpiritCost: result.totalSpiritCost
      }
    };
  } catch (error) {
    const message = failureMessage(error);

    return { code: 'FAIL', data: { message, isEnergyInsufficient: error instanceof BackendAPIError && error.code === 'DUNGEON_SWEEP_INSUFFICIENT_ENERGY' } };
  }
}
