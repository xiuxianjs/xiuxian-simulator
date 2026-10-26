import { parseGuildMemberMutation } from './guild-member-lifecycle';

export function parseRobotGuildLeave(value: unknown) {
  const data = parseGuildMemberMutation(value);

  if (!['confirmation_required', 'left'].includes(data.outcome)) {
    throw new Error('退出宗门响应不完整');
  }

  return data;
}
export function parseRobotGuildLeaderLeave(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗主请假响应不完整');
  }
  const row = value as Record<string, unknown>;
  const receipt = parseGuildMemberMutation(row.receipt);

  if (receipt.outcome !== 'leave_granted' || typeof row.message !== 'string') {
    throw new Error('宗主请假响应不完整');
  }

  return { receipt, message: row.message };
}
