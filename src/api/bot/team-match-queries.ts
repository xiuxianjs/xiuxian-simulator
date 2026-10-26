import { requestBackend } from './client';
import { parseTeamMatchSnapshot, type TeamMatchSnapshot } from '../schemas/team-match-snapshot';

export async function getBackendTeamMatchSnapshot(bid: string | undefined): Promise<TeamMatchSnapshot | null> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_teams_match_snapshot');

  return parseBackendTeamMatchSnapshot(data);
}

export function parseBackendTeamMatchSnapshot(data: unknown): TeamMatchSnapshot | null {
  if (data === null) {
    return null;
  }

  return parseTeamMatchSnapshot(data, '匹配状态接口数据不完整');
}

export async function guardBackendTeamMatchCommand(bid: string, messageText: string): Promise<{ blocked: boolean; match?: TeamMatchSnapshot }> {
  const data: unknown = await requestBackend(bid, 'post_teams_match_command_guard', { body: { messageText } });

  return parseBackendTeamMatchCommandGuard(data);
}

export function parseBackendTeamMatchCommandGuard(data: unknown): { blocked: boolean; match?: TeamMatchSnapshot } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('匹配指令判定响应不完整');
  }
  const result = data as Record<string, unknown>;

  if (typeof result.blocked !== 'boolean') {
    throw new Error('匹配指令判定响应不完整');
  }
  if (result.blocked) {
    parseTeamMatchSnapshot(result.match, '匹配指令判定快照不完整');
  }

  return data as { blocked: boolean; match?: TeamMatchSnapshot };
}
