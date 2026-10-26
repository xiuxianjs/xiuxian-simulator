import { decomposeBackendSkillBook } from '@src/api/bot/skill-book-decompose';
import type { BackendRequestContext } from '@src/api/bot/context';
import type { SkillBookDecomposeResponse } from '@src/api/schemas/skill-book-decompose';

type SkillBookDecomposeDisplay = {
  success: true;
  refundInfo: {
    skillBook: Pick<SkillBookDecomposeResponse, 'name' | 'skillType' | 'grade' | 'realm'>;
    totalExp: number;
    baseExp: number;
    items: SkillBookDecomposeResponse['refundedItems'];
  };
};

export type SkillBookDecomposeResult =
  | { code: 'OK'; data: { result: SkillBookDecomposeDisplay; skillBookId: number } }
  | { code: 'NO_SKILL_BOOKS'; data: { message: string } }
  | { code: 'NOT_FOUND'; data: { message: string; skillBookId: number } }
  | { code: 'FAILED'; data: { message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  skillBookId: number;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<SkillBookDecomposeResult> {
  try {
    const result = await decomposeBackendSkillBook(params.bid, params.uid, params.skillBookId, params.request, params.messageText);

    return {
      code: 'OK',
      data: {
        result: {
          success: true,
          refundInfo: {
            skillBook: { name: result.name, skillType: result.skillType, grade: result.grade, realm: result.realm },
            totalExp: result.refundExp,
            baseExp: result.baseExp,
            items: result.refundedItems
          }
        },
        skillBookId: params.skillBookId
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '分解功法失败，请稍后再试或联系运营。';

    if (message === '储物袋中没有功法') {
      return { code: 'NO_SKILL_BOOKS', data: { message } };
    }
    if (message === `找不到ID为 ${params.skillBookId} 的功法`) {
      return { code: 'NOT_FOUND', data: { message, skillBookId: params.skillBookId } };
    }

    return { code: 'FAILED', data: { message } };
  }
}
