import {
  batchDecomposeBackendEquipment,
  previewBackendEquipmentBatchDecompose,
  type BackendEquipmentBatchPreview
} from '@src/api/bot/equipment-batch-decompose';
import type { BackendRequestContext } from '@src/api/bot/context';

type Result =
  | {
      code: 'OK';
      data: {
        message: string;
        details: Array<{ name: string; grade: string; yield: number }>;
        totalYield: number;
        decomposedCount: number;
        remainingCount: number;
      };
    }
  | { code: 'FAIL'; data: { message: string } };

/**
 * 一键分解装备
 * @param params.uid 用户 ID
 * @param params.gradeId 可选品级 ID，用于按品级过滤
 */
export default async function App(params: { bid?: string; uid: number; gradeId?: number; request?: BackendRequestContext }): Promise<Result> {
  const result = await batchDecomposeBackendEquipment(params.bid, params.uid, params.gradeId, params.request);

  if (!result.success) {
    return { code: 'FAIL', data: { message: result.message } };
  }

  return {
    code: 'OK',
    data: {
      message: result.message,
      decomposedCount: result.decomposedCount,
      remainingCount: result.remainingCount,
      details: result.details,
      totalYield: result.totalYield
    }
  };
}

type PreviewResult =
  | {
      code: 'OK';
      data: {
        totalCount: number;
        processCount: number;
        remainingCount: number;
        gradeBreakdown: Array<{ gradeName: string; count: number; level: number }>;
        totalYield: number;
      };
    }
  | { code: 'FAIL'; data: { message: string } };

/**
 * 预览一键分解装备（不执行分解）
 * @param params.uid 用户 ID
 * @param params.gradeId 可选品级 ID，用于按品级过滤
 */
export async function previewApp(params: { bid?: string; uid: number; gradeId?: number; prepared?: BackendEquipmentBatchPreview }): Promise<PreviewResult> {
  const result = params.prepared ?? (await previewBackendEquipmentBatchDecompose(params.bid, params.uid, params.gradeId));

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
      totalYield: result.totalYield
    }
  };
}

/** 品级选项查询结果 */
type GradeOptionsResult =
  | {
      code: 'OK';
      data: {
        totalCount: number;
        grades: Array<{ id: number; name: string; level: number; count: number }>;
      };
    }
  | { code: 'FAIL'; data: { message: string } };

/**
 * 查询可分解装备的品级选项（按品级分组统计数量）
 * @param uid 用户 ID
 */
export async function fetchGradeOptionsApp(bid: string | undefined, uid: number, prepared?: BackendEquipmentBatchPreview): Promise<GradeOptionsResult> {
  const result = prepared ?? (await previewBackendEquipmentBatchDecompose(bid, uid));

  if (!result.success) {
    return { code: 'OK', data: { totalCount: 0, grades: [] } };
  }

  return {
    code: 'OK',
    data: {
      totalCount: result.totalCount,
      grades: result.gradeBreakdown.map(grade => ({ id: grade.id, name: grade.gradeName, level: grade.level, count: grade.count }))
    }
  };
}
