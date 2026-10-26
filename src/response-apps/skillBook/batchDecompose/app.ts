import {
  batchDecomposeBackendSkillBooks,
  previewBackendSkillBookBatchDecompose,
  type BackendSkillBookBatchPreview
} from '@src/api/bot/skill-book-batch-decompose';
import type { BackendRequestContext } from '@src/api/bot/context';

type GradeOption = { id: number; name: string; level: number; count: number };

type OptionsResult =
  | { code: 'EMPTY'; data: { message: string } }
  | { code: 'OK'; data: { totalCount: number; grades: GradeOption[] } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

type DecomposeResult =
  | { code: 'FAIL'; data: { message: string } }
  | { code: 'OK'; data: { decomposedCount: number; remainingCount: number; totalExp: number; items: Array<{ name: string; amount: number }> } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export async function fetchGradeOptions(params: { bid?: string; uid: number; prepared?: BackendSkillBookBatchPreview }): Promise<OptionsResult> {
  try {
    const preview = params.prepared ?? (await previewBackendSkillBookBatchDecompose(params.bid, params.uid));

    if (!preview.success) {
      return { code: 'EMPTY', data: { message: '暂无可分解的功法' } };
    }

    return {
      code: 'OK',
      data: {
        totalCount: preview.totalCount,
        grades: preview.gradeBreakdown.map(grade => ({ id: grade.id, name: grade.gradeName, level: grade.level, count: grade.count }))
      }
    };
  } catch (error) {
    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '一键分解功法失败，请稍后再试或联系运营。' } };
  }
}

export async function executeDecompose(params: { bid?: string; uid: number; gradeId?: number; request?: BackendRequestContext }): Promise<DecomposeResult> {
  try {
    const result = await batchDecomposeBackendSkillBooks(params.bid, params.uid, params.gradeId, params.request);

    if (!result.success) {
      return { code: 'FAIL', data: { message: result.message } };
    }

    return {
      code: 'OK',
      data: {
        decomposedCount: result.decomposedCount,
        remainingCount: result.remainingCount,
        totalExp: result.totalExp,
        items: result.items.map(item => ({ name: item.name, amount: item.quantity }))
      }
    };
  } catch (error) {
    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '❌ 分解失败，请稍后再试或联系运营。' } };
  }
}

type PreviewResult =
  | { code: 'FAIL'; data: { message: string } }
  | {
      code: 'OK';
      data: {
        totalCount: number;
        processCount: number;
        remainingCount: number;
        gradeBreakdown: Array<{ gradeName: string; count: number; level: number }>;
        totalExp: number;
        estimatedItems: Array<{ name: string; amount: number }>;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

// The confirmation session and its wording live in the robot. This call reads
// only server-owned candidate facts and does not create any fragment records.
export async function previewDecompose(params: {
  bid?: string;
  uid: number;
  gradeId?: number;
  prepared?: BackendSkillBookBatchPreview;
}): Promise<PreviewResult> {
  try {
    const result = params.prepared ?? (await previewBackendSkillBookBatchDecompose(params.bid, params.uid, params.gradeId));

    if (!result.success) {
      return { code: 'FAIL', data: { message: result.message } };
    }

    return {
      code: 'OK',
      data: {
        totalCount: result.totalCount,
        processCount: result.processCount,
        remainingCount: result.remainingCount,
        gradeBreakdown: result.gradeBreakdown,
        totalExp: result.totalExp,
        estimatedItems: result.estimatedItems.map(item => ({ name: item.name, amount: item.quantity }))
      }
    };
  } catch (error) {
    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '预览失败，请稍后再试。' } };
  }
}
