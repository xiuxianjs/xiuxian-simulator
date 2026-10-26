import { parseGuildWorkflow } from './guild-workflow';
export type GuildContentAction = 'intro-set' | 'notice-set' | 'essence-add' | 'essence-remove';
export function parseRobotGuildContentAction(value: unknown, action: GuildContentAction) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门业务响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (row.outcome === 'usage') {
    return { outcome: 'usage' as const };
  }
  if (row.outcome !== 'result' || typeof row.message !== 'string' || !row.message) {
    throw new Error('宗门业务响应不完整');
  }
  const receipt =
    action === 'essence-add'
      ? parseGuildWorkflow({ action: 'essence_add', content: '' }, 0, row.receipt)
      : action === 'essence-remove'
        ? parseGuildWorkflow({ action: 'essence_remove', essenceId: 0 }, 0, row.receipt)
        : parseGuildWorkflow({ action: 'content_update', field: action === 'intro-set' ? 'intro' : 'notice', content: '' }, 0, row.receipt);
  const expected = action === 'essence-add' ? 'added' : action === 'essence-remove' ? 'removed' : 'updated';

  if (receipt.outcome !== expected) {
    throw new Error('宗门业务响应不完整');
  }

  return { outcome: 'result' as const, message: row.message };
}
