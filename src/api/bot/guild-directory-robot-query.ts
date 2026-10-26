import { parseBackendGuilds } from './queries';

export function parseRobotGuildList(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门列表数据不完整');
  }
  const data = value as Record<string, unknown>;

  if (typeof data.canCreateOrApplyGuild !== 'boolean' || typeof data.redirected !== 'boolean') {
    throw new Error('宗门列表缺少状态');
  }

  return {
    result: data.result === null ? null : parseBackendGuilds(data.result),
    canCreateOrApplyGuild: data.canCreateOrApplyGuild,
    redirected: data.redirected
  };
}
