import { requestBackendQueryPresentation } from './query-presentation';
import type { BackendRequestContext } from './context';
import type { NewcomerLoginQueryData, NewcomerLoginView } from '../schemas/newcomer-login-query';
import { requestBackend } from './client';
export async function getBackendNewcomerLogin(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<NewcomerLoginQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const v = request
    ? ((await requestBackendQueryPresentation(bid, uid, 'newcomer_login', '新人狂欢', request)) as NewcomerLoginQueryData)
    : await requestBackend(bid, 'get_players_id_activities_newcomer_login', { path: { id: uid } });

  return parseBackendNewcomerLogin(v);
}

export function parseBackendNewcomerLogin(v: unknown): NewcomerLoginQueryData {
  const object = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);

  if (
    !object(v) ||
    typeof v.isInPeriod !== 'boolean' ||
    ![v.currentDayIndex, v.daysSinceRegistration, v.registrationTime, v.guildContribution].every(Number.isSafeInteger) ||
    !Array.isArray(v.claimedLoginDays) ||
    !v.claimedLoginDays.every(Number.isSafeInteger) ||
    !Array.isArray(v.claimedTaskIds) ||
    !v.claimedTaskIds.every(Number.isSafeInteger) ||
    !object(v.taskProgress) ||
    !Object.values(v.taskProgress).every(Number.isSafeInteger) ||
    !object(v.itemNames) ||
    !Object.values(v.itemNames).every(x => x === null || typeof x === 'string') ||
    !Array.isArray(v.dayConfigs) ||
    !Array.isArray(v.taskConfigs) ||
    typeof v.periodMessage !== 'string'
  ) {
    throw new Error('新人活动接口数据不完整');
  }
  for (const d of v.dayConfigs) {
    if (
      !object(d) ||
      ![d.dayIndex, d.spiritCrystal].every(Number.isSafeInteger) ||
      ![d.itemIds, d.equipSetIds].every(x => x === null || typeof x === 'string')
    ) {
      throw new Error('新人活动接口数据不完整');
    }
  }
  for (const t of v.taskConfigs) {
    if (
      !object(t) ||
      typeof t.taskKey !== 'string' ||
      ![t.id, t.dayIndex, t.threshold, t.spiritCrystal, t.vipExpYuan, t.sortOrder].every(Number.isSafeInteger)
    ) {
      throw new Error('新人活动接口数据不完整');
    }
  }

  if (v.isInPeriod) {
    parseBackendNewcomerLoginView(v.view);
  }

  return v as unknown as NewcomerLoginQueryData;
}

export function parseBackendNewcomerLoginView(view: unknown): NewcomerLoginView {
  const object = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === 'object' && !Array.isArray(x);
  const dayStatuses = new Set(['LOCKED', 'MISSED', 'AVAILABLE', 'CLAIMED']);
  const milestoneStatuses = new Set(['LOCKED', 'CLAIMABLE', 'CLAIMED']);

  if (
    !object(view) ||
    ![view.eventDays, view.contentDays, view.currentDayIndex].every(Number.isSafeInteger) ||
    typeof view.timeRange !== 'string' ||
    typeof view.nextUnlockText !== 'string' ||
    (view.signInCommand !== undefined && typeof view.signInCommand !== 'string') ||
    typeof view.totalText !== 'string' ||
    !Array.isArray(view.overviewDays) ||
    !Array.isArray(view.detailDays) ||
    view.overviewDays.length !== view.contentDays ||
    view.detailDays.length !== view.contentDays
  ) {
    throw new Error('新人活动展示投影不完整');
  }
  for (const day of view.overviewDays) {
    if (
      !object(day) ||
      !Number.isSafeInteger(day.day) ||
      typeof day.theme !== 'string' ||
      typeof day.status !== 'string' ||
      !dayStatuses.has(day.status) ||
      typeof day.taskSummary !== 'string' ||
      (day.command !== undefined && typeof day.command !== 'string')
    ) {
      throw new Error('新人活动展示投影不完整');
    }
  }
  for (const day of view.detailDays) {
    if (
      !object(day) ||
      !Number.isSafeInteger(day.day) ||
      typeof day.theme !== 'string' ||
      typeof day.flavor !== 'string' ||
      typeof day.status !== 'string' ||
      !dayStatuses.has(day.status) ||
      typeof day.configExists !== 'boolean' ||
      typeof day.rewardText !== 'string' ||
      typeof day.rewardStatus !== 'string' ||
      !Array.isArray(day.tasks)
    ) {
      throw new Error('新人活动展示投影不完整');
    }
    for (const task of day.tasks) {
      if (!object(task) || typeof task.label !== 'string' || typeof task.progressText !== 'string' || !Array.isArray(task.milestones)) {
        throw new Error('新人活动展示投影不完整');
      }
      for (const milestone of task.milestones) {
        if (
          !object(milestone) ||
          typeof milestone.text !== 'string' ||
          typeof milestone.status !== 'string' ||
          !milestoneStatuses.has(milestone.status) ||
          (milestone.command !== undefined && typeof milestone.command !== 'string')
        ) {
          throw new Error('新人活动展示投影不完整');
        }
      }
    }
  }

  return view as unknown as NewcomerLoginView;
}
