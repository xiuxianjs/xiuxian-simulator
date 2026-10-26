import { challengeBackendDungeon, type BackendDungeonChallenge } from '@src/api/bot/dungeon-challenge';
import type { BackendRequestContext } from '@src/api/bot/context';

export { parseDungeonCommand } from '@src/response/dungeon/enter/command';
export async function executeDungeon(input: {
  bid?: string;
  uid: number;
  dungeonName: string;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<{ code: 'OK'; data: BackendDungeonChallenge } | { code: 'FAIL'; data: { message: string } }> {
  try {
    return { code: 'OK', data: await challengeBackendDungeon(input.bid, input.uid, input.dungeonName, input.request, input.messageText) };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof Error ? error.message : '秘境挑战失败' } };
  }
}
