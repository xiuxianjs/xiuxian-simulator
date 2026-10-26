import { parseGuildRename } from './guild-rename';
import { parseGuildWorkflow } from './guild-workflow';
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门设置响应不完整');
  }

  return value as Record<string, unknown>;
}
export function parseRobotGuildSetting(value: unknown, action: 'min-realm' | 'rename') {
  const row = record(value);

  if (row.outcome === 'usage') {
    return { outcome: 'usage' as const };
  }
  if (row.outcome !== 'result' || typeof row.message !== 'string' || !row.message) {
    throw new Error('宗门设置响应不完整');
  }
  const receipt = action === 'rename' ? parseGuildRename(row.receipt) : parseGuildWorkflow({ action: 'min_realm', searchTerm: '' }, 0, row.receipt);

  if (receipt.outcome !== (action === 'rename' ? 'renamed' : 'updated')) {
    throw new Error('宗门设置响应不完整');
  }

  return { outcome: 'result' as const, message: row.message };
}
