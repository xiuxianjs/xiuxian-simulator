import { parseGuildWorkflow } from './guild-workflow';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('宗门职位业务响应不完整');
  }

  return value as Record<string, unknown>;
}
export function parseRobotGuildRoleAppoint(value: unknown) {
  const row = record(value);

  if (row.outcome === 'usage') {
    if (!Array.isArray(row.roles) || !row.roles.every(role => role && Number.isSafeInteger(role.id) && typeof role.name === 'string')) {
      throw new Error('宗门职位业务响应不完整');
    }

    return { outcome: 'usage' as const, roleList: row.roles.map(role => `${role.name}（ID:${role.id}）`).join('、') };
  }
  if (row.outcome !== 'result' || typeof row.message !== 'string') {
    throw new Error('宗门职位业务响应不完整');
  }
  const data = parseGuildWorkflow({ action: 'role_appoint', roleName: '' }, 0, row.receipt);

  if (data.outcome !== 'appointed' || !('message' in data)) {
    throw new Error('宗门职位业务响应不完整');
  }

  return { outcome: 'result' as const, message: row.message };
}
export function parseRobotGuildRoleResign(value: unknown, uid: number) {
  const row = record(value);

  if (row.outcome === 'options') {
    const data = parseGuildWorkflow({ action: 'resignation_options' }, uid, row.data);

    if (data.membershipStatus !== 'joined' || data.operatorUserId === null) {
      throw new Error('宗门职位业务响应不完整');
    }

    return {
      outcome: 'options' as const,
      members: data.members.map(member => ({
        ...member,
        userName: member.userExists ? `${member.name}（${member.realmName ?? '未知'}）` : '未知',
        roleName: member.roleName ?? '弟子'
      })),
      operatorRole: data.operatorRoleName ?? '弟子',
      operatorUserId: data.operatorUserId,
      isDeputy: data.isDeputy
    };
  }
  const data = parseGuildWorkflow({ action: 'role_resign' }, uid, { kind: 'resign', result: row.receipt });

  if (data.kind !== 'resign') {
    throw new Error('宗门职位业务响应不完整');
  }
  if (row.outcome === 'confirmation' && data.result.outcome === 'confirmation_required') {
    return { outcome: 'confirmation' as const };
  }
  if (row.outcome !== 'result' || typeof row.message !== 'string' || !['appointed', 'resigned'].includes(data.result.outcome)) {
    throw new Error('宗门职位业务响应不完整');
  }

  return { outcome: 'result' as const, message: row.message };
}
