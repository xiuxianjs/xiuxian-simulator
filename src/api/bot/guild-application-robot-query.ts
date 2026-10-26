import { parseGuildApplications } from './guild-application-queries';
import { parseGuildApplicationCancel } from './guild-application-cancel';
import { parseGuildApplicationDecision } from './guild-membership-mutations';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门申请业务响应不完整');
  }

  return value as Record<string, unknown>;
}
export function parseRobotGuildApplicationCancel(value: unknown) {
  const row = record(value);

  if (row.outcome === 'list') {
    const data = parseGuildApplications(row.data);

    return {
      outcome: 'list' as const,
      pendingApps: data.applications.map(app => ({ id: app.id, guildId: app.guildId, guildName: app.guildNameText, status: app.statusText }))
    };
  }
  if (row.outcome !== 'result' || typeof row.message !== 'string') {
    throw new Error('宗门申请业务响应不完整');
  }
  const receipt = parseGuildApplicationCancel(row.receipt);

  if (receipt.outcome !== 'cancelled') {
    throw new Error('宗门申请业务响应不完整');
  }

  return { outcome: 'result' as const, message: row.message };
}
export function parseRobotGuildApplicationDecision(value: unknown) {
  const row = record(value);

  if (row.outcome === 'no_target') {
    return { outcome: 'no_target' as const };
  }
  if (row.outcome !== 'result' || typeof row.message !== 'string') {
    throw new Error('宗门申请业务响应不完整');
  }
  const receipt = parseGuildApplicationDecision(row.receipt);

  if (receipt.outcome === 'auto_rejected') {
    throw new Error('宗门申请业务响应不完整');
  }

  return { outcome: 'result' as const, message: row.message };
}
