import { batchLearnCurrentBackendSkillBooks, getBackendSkillBookBatchLearnCandidates } from '@src/api/bot/skill-book-batch-learn';
import type { BackendRequestContext } from '@src/api/bot/context';

type Book = { name: string; skillType: string };

type BatchLearnAppResult =
  | { code: 'NOT_REGISTERED'; data: { message: string } }
  | { code: 'PREVIEW'; data: { learnList: Book[]; skippedConflicts: Book[] } }
  | { code: 'NO_AVAILABLE'; data: { message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } }
  | { code: 'OK'; data: { successList: Book[]; failList: Array<Book & { reason: string }>; skippedConflicts: Book[] } };

// Candidate selection is a pure server query. The robot keeps only the
// confirmation dialogue and message layout; the confirmed state transition is
// one server transaction rather than a loop of single-book requests.
export default async function App(params: { bid?: string; uid: number; previewOnly?: boolean; request?: BackendRequestContext }): Promise<BatchLearnAppResult> {
  try {
    const command = params.previewOnly ? undefined : await batchLearnCurrentBackendSkillBooks(params.bid, params.uid, params.request);
    const candidates = command?.selection ?? (await getBackendSkillBookBatchLearnCandidates(params.bid, params.uid));
    const learnList = candidates.candidates.map(({ name, skillType }) => ({ name, skillType }));
    const skippedConflicts = candidates.skippedConflicts.map(({ name, skillType }) => ({ name, skillType }));

    if (learnList.length === 0) {
      return { code: 'NO_AVAILABLE', data: { message: '暂无可学习的功法' } };
    }
    if (params.previewOnly) {
      return { code: 'PREVIEW', data: { learnList, skippedConflicts } };
    }

    const results = command?.results ?? [];
    const successList: Book[] = [];
    const failList: Array<Book & { reason: string }> = [];

    for (const result of results) {
      if (result.success && result.skillBook) {
        successList.push(result.skillBook);
        continue;
      }
      failList.push({ name: result.skillBook?.name ?? '未知功法', skillType: result.skillBook?.skillType ?? '未知', reason: result.message });
    }

    return { code: 'OK', data: { successList, failList, skippedConflicts } };
  } catch (_error) {
    return { code: 'LOAD_FAILED', data: { message: '一键学习功法失败，请稍后再试。' } };
  }
}
