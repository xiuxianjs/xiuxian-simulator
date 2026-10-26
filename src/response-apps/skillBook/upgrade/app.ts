import { BackendAPIError } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';
import { upgradeBackendSkillBook, type BackendSkillBookUpgradeResult } from '@src/api/bot/skill-book-upgrade';

type UpgradedSkillBookResult = Extract<BackendSkillBookUpgradeResult, { outcome: 'upgraded' }>;

export type SkillBookUpgradeResult =
  | { code: 'OK'; data: { result: UpgradedSkillBookResult; skillBookId: number } }
  | { code: 'NO_SKILL_BOOKS'; data: { message: string } }
  | { code: 'NOT_FOUND'; data: { message: string; skillBookId: number } }
  | { code: 'FAILED'; data: { message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  skillBookId: number;
  request?: BackendRequestContext;
}): Promise<SkillBookUpgradeResult> {
  try {
    const result = await upgradeBackendSkillBook(params.bid, params.uid, params.skillBookId, params.request);

    if (result.outcome === 'no_skill_books') {
      return { code: 'NO_SKILL_BOOKS', data: { message: '您还没有已学习的功法' } };
    }
    if (result.outcome !== 'upgraded') {
      return { code: 'NOT_FOUND', data: { message: `找不到ID为 ${params.skillBookId} 的已学功法`, skillBookId: params.skillBookId } };
    }

    return { code: 'OK', data: { result, skillBookId: params.skillBookId } };
  } catch (error) {
    if (error instanceof BackendAPIError) {
      return { code: 'FAILED', data: { message: error.message } };
    }

    return { code: 'LOAD_FAILED', data: { message: '升级功法失败，请稍后再试或联系运营。' } };
  }
}
