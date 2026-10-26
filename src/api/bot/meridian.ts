import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';
import type { Schemas } from '../schemas';

export type BackendMeridianView = Schemas['MeridianView'];

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const meridianStatus = (value: unknown): boolean => record(value) &&
  [value.index, value.phase, value.phaseIndex, value.normalPulsesRemaining, value.Progress, value.RequiredProgress].every(integer) &&
  typeof value.tailJumpEscalation === 'boolean' &&
  typeof value.phaseName === 'string' &&
  typeof value.Name === 'string' &&
  typeof value.Category === 'string' &&
  typeof value.Description === 'string' &&
  typeof value.completed === 'boolean';
const meridianPhases = (value: unknown): boolean => Array.isArray(value) &&
  value.every(
    item => record(item) &&
      [item.phase, item.totalCount, item.completedCount].every(integer) &&
      typeof item.name === 'string' &&
      typeof item.completed === 'boolean' &&
      typeof item.unlocked === 'boolean'
  );
const meridianConfig = (value: unknown): boolean => record(value) &&
  ['TOTAL_COUNT', 'QI_PER_MERIDIAN', 'PULSE_QI_COST', 'PULSE_PROGRESS', 'DAILY_PULSE_MAX', 'DAILY_EXTRA_PULSE_MAX', 'FOUNDATION_STAGE_LEVEL'].every(field => integer(value[field])
  ) &&
  Object.values(value).every(integer);

export async function getBackendMeridians(bid: string, uid: number, request?: BackendRequestContext): Promise<BackendMeridianView> {
  if (!bid.trim() || !Number.isSafeInteger(uid) || uid < 1) {
    throw new Error('经络查询参数无效');
  }
  const data = await requestBackend(bid, 'get_players_id_meridians', { path: { id: uid }, requestId: request?.requestId });

  return parseMeridianView(data);
}

export function parseMeridianView(data: any): BackendMeridianView {
  if (
    !record(data) ||
    !Array.isArray(data.meridians) ||
    data.meridians.length === 0 ||
    !data.meridians.every(meridianStatus) ||
    !meridianConfig(data.config) ||
    !meridianPhases(data.phases) ||
    ![data.currentPhase, data.basePulseRemaining, data.extraPulseRemaining].every(integer) ||
    typeof data.currentPhaseName !== 'string' ||
    typeof data.canPulse !== 'boolean' ||
    typeof data.pulseBlockedReason !== 'string' ||
    ![data.TrueQi, data.DailyPulseRemaining, data.CompletedCount, data.progressPercent].every(integer) ||
    typeof data.isLocked !== 'boolean' ||
    typeof data.allCompleted !== 'boolean' ||
    typeof data.showPulseButton !== 'boolean' ||
    typeof data.progressBar !== 'string' ||
    (data.current !== null && !meridianStatus(data.current)) ||
    (data.next !== null && !meridianStatus(data.next)) ||
    (data.allCompleted ? data.current !== null || data.next !== null : data.current === null)
  ) {
    throw new Error('经络接口返回不完整，请更新服务端后重试');
  }

  return data as unknown as BackendMeridianView;
}

export type BackendMeridianPulse = Schemas['MeridianPulse'];

export async function pulseBackendMeridian(bid: string, uid: number, request?: BackendRequestContext): Promise<BackendMeridianPulse> {
  if (!bid.trim() || !Number.isSafeInteger(uid) || uid < 1) {
    throw new Error('冲脉参数无效');
  }
  const data = await requestBackend(bid, 'post_players_id_meridians_pulse', { path: { id: uid }, ...writeContext(request) });

  return parseMeridianPulse(data);
}

export function parseMeridianPulse(data: any): BackendMeridianPulse {
  if (
    !meridianStatus(data) ||
    !meridianConfig(data?.config) ||
    !meridianPhases(data.phases) ||
    typeof data.phaseCompleted !== 'boolean' ||
    typeof data.allCompleted !== 'boolean' ||
    typeof data.canPulse !== 'boolean' ||
    typeof data.pulseBlockedReason !== 'string' ||
    typeof data.jumped !== 'boolean' ||
    ![data.progressBefore, data.basePulseRemaining, data.extraPulseRemaining, data.trueQiRemaining, data.dailyPulseRemaining].every(integer)
  ) {
    throw new Error('冲脉接口返回不完整，请更新服务端后重试');
  }

  return data;
}
