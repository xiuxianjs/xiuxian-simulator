import { getBackendLearnedBooks } from '@src/api/bot/learned-books-queries';
import type { LearnedSkillBookProjected } from '@src/types/skillBook';
import { logger } from 'alemonjs';

export type MySkillBooksResult =
  | {
      code: 'OK';
      data: {
        inUseBooks: LearnedSkillBookProjected[];
        items: LearnedSkillBookProjected[];
        total: number;
        totalPages: number;
        currentPage: number;
        proficiencyPoints: number;
        canUseFifthLayerFeature: boolean;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; page: number }): Promise<MySkillBooksResult> {
  try {
    const result = await getBackendLearnedBooks(params.bid, params.uid, params.page, 'visible');

    return {
      code: 'OK',
      data: result
    };
  } catch (error) {
    logger.error('查看已学习功法失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看已学习功法失败，请稍后再试或联系运营。' } };
  }
}
