import { formatGameTime } from '@src/utils/gameTime';
import type { CancelApplicationResult } from '@src/response-apps/team/cancelApplication/app';

export type RobotTeamApplicationCancelResult = Exclude<CancelApplicationResult, { code: 'NO_PENDING' }> | { code: 'NO_PENDING'; data: { message: string } };

export function parseRobotTeamApplicationCancel(value: unknown): RobotTeamApplicationCancelResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('取消申请接口响应不完整');
  }
  const data = value as Record<string, unknown>;

  if (data.outcome === 'no_pending' || data.outcome === 'not_pending') {
    if (typeof data.message !== 'string') {
      throw new Error('取消申请接口缺少反馈');
    }

    return { code: data.outcome === 'no_pending' ? 'NO_PENDING' : 'CANCEL_FAILED', data: { message: data.message } };
  }
  if (data.outcome === 'cancelled') {
    if (data.leaderName !== null && typeof data.leaderName !== 'string') {
      throw new Error('取消申请接口缺少队长姓名');
    }

    return { code: 'CANCEL_OK', data: { message: `已取消向【${data.leaderName === '' ? '未知' : (data.leaderName ?? '未知')}】队伍的申请` } };
  }
  if (data.outcome !== 'list' || !Array.isArray(data.applications) || data.applications.length === 0) {
    throw new Error('取消申请列表不完整');
  }
  const applications = data.applications.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('取消申请列表不完整');
    }
    const row = value as Record<string, unknown>;

    if (
      !Number.isSafeInteger(row.id) ||
      Number(row.id) <= 0 ||
      (row.leaderName !== null && typeof row.leaderName !== 'string') ||
      typeof row.createdAt !== 'string' ||
      !Number.isFinite(new Date(row.createdAt).getTime())
    ) {
      throw new Error('取消申请列表不完整');
    }

    return { id: Number(row.id), leaderName: row.leaderName ?? '未知', createdAt: formatGameTime(row.createdAt) };
  });

  return { code: 'LIST', data: { applications } };
}
