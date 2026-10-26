import { getBackendLearnedBooks } from '@src/api/bot/learned-books-queries';
import type { LearnedSkillBookProjected } from '@src/types/skillBook';
import { logger } from 'alemonjs';

export type HiddenSkillBookListResult =
  | {
      code: 'OK';
      data: {
        items: LearnedSkillBookProjected[];
        total: number;
        totalPages: number;
        currentPage: number;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export async function getMyHiddenSkillBooks(params: { bid?: string; uid: number; page: number }): Promise<HiddenSkillBookListResult> {
  try {
    const result = await getBackendLearnedBooks(params.bid, params.uid, params.page, 'hidden');

    return {
      code: 'OK',
      data: {
        items: result.items,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage
      }
    };
  } catch (error) {
    logger.error('查看隐藏功法失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看隐藏功法失败，请稍后再试或联系运营。' } };
  }
}
