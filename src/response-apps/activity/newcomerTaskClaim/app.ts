import { claimBackendNewcomerTask } from '@src/api/bot/newcomer-login-actions';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type NewcomerTaskClaimResult =
  | { code: 'OK'; data: { spiritCrystal: number; vipExpYuan: number } }
  | { code: 'INSUFFICIENT_PROGRESS'; data: { taskLabel: string; required: number; current: number; unit: string } }
  | {
      code: 'INVALID_USER' | 'INVALID_TASK_ID' | 'OUT_OF_PERIOD' | 'TASK_NOT_FOUND' | 'NOT_UNLOCKED' | 'ALREADY_CLAIMED' | 'CLAIM_FAILED';
      data?: undefined;
    };

export default async function App(params: {
  bid?: string;
  uid?: number;
  taskConfigId: number;
  request?: BackendRequestContext;
}): Promise<NewcomerTaskClaimResult> {
  if (!params.uid) {
    return { code: 'INVALID_USER' };
  }
  if (!Number.isInteger(params.taskConfigId) || params.taskConfigId <= 0) {
    return { code: 'INVALID_TASK_ID' };
  }
  try {
    const result = await claimBackendNewcomerTask(params.bid, params.uid, params.taskConfigId, params.request);

    if (result.code === 'OK') {
      if (!Number.isFinite(result.spiritCrystal) || !Number.isFinite(result.vipExpYuan)) {
        throw new Error('新人任务领奖响应不完整');
      }

      return { code: 'OK', data: { spiritCrystal: result.spiritCrystal as number, vipExpYuan: result.vipExpYuan as number } };
    }
    if (result.code === 'INSUFFICIENT_PROGRESS') {
      if (typeof result.taskLabel !== 'string' || !Number.isFinite(result.required) || !Number.isFinite(result.current) || typeof result.unit !== 'string') {
        throw new Error('新人任务进度响应不完整');
      }

      return {
        code: 'INSUFFICIENT_PROGRESS',
        data: { taskLabel: result.taskLabel, required: result.required as number, current: result.current as number, unit: result.unit }
      };
    }

    return { code: result.code as Extract<NewcomerTaskClaimResult, { data?: undefined }>['code'] };
  } catch (error) {
    logger.error('领取新人任务奖励失败:', error);

    return { code: 'CLAIM_FAILED' };
  }
}
