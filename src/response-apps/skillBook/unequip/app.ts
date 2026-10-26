import { unequipBackendSkillBook } from '@src/api/bot/skill-book-unequip';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type SkillBookUnequipResult =
  | { code: 'OK'; data: { result: { skillBook: { name: string; skillType: string } } } }
  | { code: 'FAILED'; data: { message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  skillTypeName: string;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<SkillBookUnequipResult> {
  try {
    const result = await unequipBackendSkillBook(params.bid, params.uid, params.skillTypeName, params.request, params.messageText);

    if (result.outcome === 'not_in_use') {
      return { code: 'FAILED', data: { message: `当前没有使用中的${params.skillTypeName}` } };
    }

    return {
      code: 'OK',
      data: { result: { skillBook: { name: result.skillBook?.name ?? '未知功法', skillType: result.skillBook?.skillType ?? params.skillTypeName } } }
    };
  } catch (error) {
    logger.error(`换下${params.skillTypeName}失败:`, error);

    return { code: 'LOAD_FAILED', data: { message: `换下${params.skillTypeName}失败，请稍后再试或联系运营。` } };
  }
}
