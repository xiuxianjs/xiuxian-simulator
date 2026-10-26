import { parseGuildWorkflow } from './guild-workflow';
import { parseGuildImpeach } from './guild-impeach';

export function parseRobotGuildDissolve(value: unknown) {
  const data = parseGuildWorkflow({ action: 'dissolve' }, 0, value);

  if (data.outcome === 'not_joined') {
    throw new Error('解散宗门响应不完整');
  }

  return data;
}
export function parseRobotGuildImpeach(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('弹劾响应不完整');
  }
  const row = value as Record<string, unknown>;
  const data = parseGuildImpeach(row.receipt);

  if (typeof row.message !== 'string') {
    throw new Error('弹劾响应不完整');
  }

  return { ...data, message: row.message };
}
