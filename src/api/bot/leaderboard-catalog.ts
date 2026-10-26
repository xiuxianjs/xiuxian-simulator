import { requestBackend } from './client';

export type LeaderboardMenuItem = { group: string; label: string; command: string; description: string };

export async function getBackendLeaderboardMenu(bid: string | undefined): Promise<{ items: LeaderboardMenuItem[]; hint: string }> {
  if (!bid) {
    throw new Error('排行榜查询缺少平台身份');
  }

  return parseLeaderboardMenu(await requestBackend(bid, 'get_leaderboards'));
}

export function parseLeaderboardMenu(data: unknown): { items: LeaderboardMenuItem[]; hint: string } {
  if (!Array.isArray(data)) {
    throw new Error('排行榜目录接口数据不完整');
  }

  const items: LeaderboardMenuItem[] = [];
  let hint = '';

  for (const value of data) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('排行榜目录条目不完整');
    }
    const row = value as Record<string, unknown>;

    if (row.menuHint !== undefined) {
      if (typeof row.menuHint !== 'string' || hint) {
        throw new Error('排行榜目录提示不完整');
      }
      hint = row.menuHint;
    }
    if (row.menu === undefined) {
      continue;
    }
    if (!row.menu || typeof row.menu !== 'object' || Array.isArray(row.menu)) {
      throw new Error('排行榜目录按钮不完整');
    }
    const menu = row.menu as Record<string, unknown>;

    if (typeof menu.group !== 'string' || typeof menu.label !== 'string' || typeof menu.command !== 'string' || typeof menu.description !== 'string') {
      throw new Error('排行榜目录按钮不完整');
    }
    items.push({ group: menu.group, label: menu.label, command: menu.command, description: menu.description });
  }

  if (items.length === 0 || !hint) {
    throw new Error('排行榜目录展示数据不完整');
  }

  return { items, hint };
}
