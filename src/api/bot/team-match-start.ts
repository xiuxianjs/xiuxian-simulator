import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type TeamMatchStart = { targetLabel: string };

export function parseBackendTeamMatchStart(value: unknown): TeamMatchStart {
  if (!value || typeof value !== 'object' || typeof (value as { targetLabel?: unknown }).targetLabel !== 'string') {
    throw new Error('进入匹配响应不完整');
  }

  return { targetLabel: (value as { targetLabel: string }).targetLabel };
}

export async function startBackendMainlineMatch(
  bid: string | undefined,
  chapterNumber: number,
  stageNumber: number,
  request?: BackendRequestContext
): Promise<TeamMatchStart> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseBackendTeamMatchStart(
    await requestBackend(bid, 'post_teams_match', {
      headers: repeatPresentationHeaders('匹配主线'),
      body: { mode: 'mainline', chapterNumber, stageNumber },
      ...writeContext(request)
    })
  );
}

export async function startBackendDungeonMatch(bid: string | undefined, dungeonId: number, request?: BackendRequestContext): Promise<TeamMatchStart> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }

  return parseBackendTeamMatchStart(
    await requestBackend(bid, 'post_teams_match', {
      headers: repeatPresentationHeaders('匹配秘境'),
      body: { mode: 'dungeon', targetId: dungeonId },
      ...writeContext(request)
    })
  );
}
