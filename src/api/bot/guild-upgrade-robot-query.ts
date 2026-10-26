import { parseGuildUpgrade, type GuildUpgradeKind } from './guild-upgrade';

export function parseRobotGuildUpgrade(value: unknown, kind: GuildUpgradeKind) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门升级响应不完整');
  }
  const row = value as Record<string, unknown>;
  const receipt = parseGuildUpgrade(row.receipt, kind);

  if (typeof row.message !== 'string' || !row.message) {
    throw new Error('宗门升级响应不完整');
  }

  return { receipt, message: row.message };
}
