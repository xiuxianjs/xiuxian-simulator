import { parseGuildWorkflow } from './guild-workflow';
import type { GuildEssencesQueryResult } from '../schemas/guild-essences';
export function parseRobotGuildContent(value: unknown) {
  const row = parseGuildWorkflow({ action: 'content' }, 0, value);

  if (!row.hasMembership) {
    throw new Error('宗门业务响应不完整');
  }

  return { guildName: row.guildName ?? '', notice: row.notice ?? null, intro: row.intro ?? null };
}
export function presentGuildEssences(result: GuildEssencesQueryResult) {
  return {
    success: true,
    guildName: result.guildName,
    essences: result.items.map(item => ({
      ...item,
      creatorName: item.creatorName ?? '未知',
      createdAt: item.createdAt
    })),
    total: result.total,
    currentPage: result.page,
    totalPages: result.totalPages
  };
}
export function parseRobotGuildEssences(value: unknown) {
  const row = parseGuildWorkflow({ action: 'essences', page: 1 }, 0, value);

  if (!row.hasMembership) {
    throw new Error('宗门业务响应不完整');
  }

  return presentGuildEssences(row);
}
