import { getBackendSkillDetail } from '@src/api/bot/skill-detail-queries';
import type { LearnedSkillBookData } from '@src/types/skillBook';
import { logger } from 'alemonjs';

export type SkillBookDetailResult =
  | { code: 'OK'; data: { skillBook: LearnedSkillBookData; skillBookId: number; proficiencyPoints: number } }
  | { code: 'NO_SKILL_BOOKS'; data: { message: string } }
  | { code: 'NOT_FOUND'; data: { message: string; skillBookId: number } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; skillBookId: number }): Promise<SkillBookDetailResult> {
  try {
    const result = await getBackendSkillDetail(params.bid, params.uid, params.skillBookId);

    if (result.outcome === 'NO_SKILL_BOOKS') {
      return { code: 'NO_SKILL_BOOKS', data: { message: '暂无已学习的功法' } };
    }

    const targetSkillBook = result.book;

    if (result.outcome === 'NOT_FOUND') {
      return { code: 'NOT_FOUND', data: { message: `找不到ID为 ${params.skillBookId} 的已学功法`, skillBookId: params.skillBookId } };
    }

    if (!targetSkillBook) {
      throw new Error('功法详情接口缺少实例');
    }

    return { code: 'OK', data: { skillBook: targetSkillBook, skillBookId: params.skillBookId, proficiencyPoints: result.proficiencyPoints } };
  } catch (error) {
    logger.error('查看功法详情失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看功法详情失败，请稍后再试或联系运营。' } };
  }
}
