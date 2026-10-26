import { parseCompanionInfo } from './companion-info-queries';
import { parseCompanionTasks } from './companion-tasks-queries';
import { parseBackendGiftRecords } from './queries';
import { presentCompanionInfo, presentCompanionTasks } from '@src/utils/companionQueryPresentation';
import { presentGiftRecords, type GiftRecordMode } from '@src/utils/giftRecordPresentation';

export function parseRobotCompanionInfo(value: unknown) {
  const out = presentCompanionInfo(parseCompanionInfo(value));

  if (out.code !== 'OK') {
    throw new Error('道侣接口数据不完整');
  }

  return out.data;
}
export function parseRobotCompanionTasks(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('道侣任务数据不完整');
  }
  const data = value as Record<string, unknown>;

  if (data.mode === 'auto-claim-hint') {
    if (typeof data.message !== 'string' || !data.message) {
      throw new Error('道侣任务数据不完整');
    }

    return { code: 'AUTO_CLAIM_HINT' as const, data: { message: data.message } };
  }
  if (data.mode !== 'tasks') {
    throw new Error('道侣任务数据不完整');
  }
  const out = presentCompanionTasks(parseCompanionTasks(value), '');

  if (out.code !== 'OK') {
    throw new Error('道侣任务数据不完整');
  }

  return out;
}
export function parseRobotGiftRecords(value: unknown, mode: GiftRecordMode) {
  return presentGiftRecords(parseBackendGiftRecords(value), mode);
}
