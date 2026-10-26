import { getBackendSeclusionSelection, type BackendSeclusionStatus } from '@src/api/bot/seclusion-status';
import { logger } from 'alemonjs';

type SeclusionSelectResult =
  | { code: 'OK'; data: { status: BackendSeclusionStatus; dungeon: NonNullable<BackendSeclusionStatus['availableDungeons'][number]> } }
  | { code: 'IN_SECLUSION'; data: { status: BackendSeclusionStatus } }
  | { code: 'DUNGEON_NOT_FOUND'; data: { message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; dungeonName: string }): Promise<SeclusionSelectResult> {
  try {
    const selection = await getBackendSeclusionSelection(params.bid, params.uid, params.dungeonName);

    if (selection.code === 'IN_SECLUSION') {
      return { code: 'IN_SECLUSION', data: { status: selection.status } };
    }
    if (selection.code === 'DUNGEON_NOT_FOUND') {
      return { code: 'DUNGEON_NOT_FOUND', data: { message: selection.message } };
    }

    return { code: 'OK', data: { status: selection.status, dungeon: selection.dungeon } };
  } catch (error) {
    logger.error('[探索] 选择时长错误:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看失败，请稍后再试' } };
  }
}
