import { useBackendSkillBookProficiency } from '@src/api/bot/skill-book-proficiency';
import type { BackendRequestContext } from '@src/api/bot/context';

export type ProficiencyUseResult =
  | {
      code: 'OK';
      data: {
        skillBookName: string;
        consumedPoints: number;
        oldProficiency: number;
        newProficiency: number;
        remainingPoints: number;
        successCount: number;
        failCount: number;
        pityTriggered: boolean;
      };
    }
  | { code: 'NO_SKILL_BOOKS'; data: { message: string } }
  | { code: 'NOT_FOUND'; data: { message: string } }
  | { code: 'INVALID_INPUT'; data: { message: string } }
  | { code: 'MAX_PROFICIENCY'; data: { message: string } }
  | { code: 'INSUFFICIENT_POINTS'; data: { message: string; currentPoints: number; requiredPoints: number } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  identifier: string;
  points: number | '全部';
  request?: BackendRequestContext;
}): Promise<ProficiencyUseResult> {
  try {
    const result = await useBackendSkillBookProficiency(params.bid, params.uid, params.identifier, params.points, params.request);

    switch (result.outcome) {
      case 'ok':
        return {
          code: 'OK',
          data: {
            skillBookName: result.skillBookName!,
            consumedPoints: result.consumedPoints!,
            oldProficiency: result.oldProficiency!,
            newProficiency: result.newProficiency!,
            remainingPoints: result.remainingPoints!,
            successCount: result.successCount!,
            failCount: result.failCount!,
            pityTriggered: result.pityTriggered!
          }
        };
      case 'no_skill_books':
        return { code: 'NO_SKILL_BOOKS', data: { message: result.message! } };
      case 'not_found':
        return { code: 'NOT_FOUND', data: { message: result.message! } };
      case 'invalid_input':
        return { code: 'INVALID_INPUT', data: { message: result.message! } };
      case 'max_proficiency':
        return { code: 'MAX_PROFICIENCY', data: { message: result.message! } };
      case 'insufficient_points':
        return {
          code: 'INSUFFICIENT_POINTS',
          data: { message: result.message!, currentPoints: result.currentPoints!, requiredPoints: result.requiredPoints! }
        };
    }
  } catch {
    return { code: 'LOAD_FAILED', data: { message: '参悟失败，请稍后再试或联系运营。' } };
  }
}
