import { parseGuildCreate, parseGuildApply } from './guild-membership-mutations';

function record(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门申请响应不完整');
  }

  return value as Record<string, unknown>;
}
export function parseRobotGuildCreate(value: unknown) {
  const row = record(value);

  if (row.outcome === 'usage') {
    return { outcome: 'usage' as const };
  }
  if (row.outcome !== 'result') {
    throw new Error('创建宗门响应不完整');
  }
  const data = parseGuildCreate(row.receipt);

  return { outcome: 'result' as const, data: { message: `宗门【${data.name}】创建成功，您已成为宗主` } };
}
export function parseRobotGuildApply(value: unknown) {
  const row = record(value);

  if (row.outcome === 'usage') {
    return { outcome: 'usage' as const };
  }
  if (row.outcome !== 'result') {
    throw new Error('入宗申请响应不完整');
  }
  const data = parseGuildApply(row.receipt);

  return { outcome: 'result' as const, data: { ...data, message: `已向【${data.guildName}】提交加入申请，请等待审核` } };
}
