import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type PopularityLikeData = {
  message: string;
  remainingLikes: number;
  currentPopularity: number;
  boardType: string;
  boardLabel: string;
};

export async function likeBackendPopularity(
  bid: string | undefined,
  uid: number,
  targetUserId: number,
  boardType: string,
  request?: BackendRequestContext,
  repeatCommand?: string
) {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data: unknown = await requestBackend(bid, 'post_players_id_popularity_likes', {
    headers: repeatPresentationHeaders(repeatCommand),
    path: { id: uid },
    body: { targetUserId, boardType },
    ...writeContext(request)
  });

  return parseBackendPopularityLike(data);
}

export function parseBackendPopularityLike(data: unknown): PopularityLikeData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('人气点赞响应不完整');
  }
  const row = data as Record<string, unknown>;

  if (
    typeof row.message !== 'string' ||
    typeof row.remainingLikes !== 'number' ||
    !Number.isSafeInteger(row.remainingLikes) ||
    row.remainingLikes < 0 ||
    typeof row.currentPopularity !== 'number' ||
    !Number.isSafeInteger(row.currentPopularity) ||
    row.currentPopularity < 0 ||
    typeof row.boardType !== 'string' ||
    typeof row.boardLabel !== 'string'
  ) {
    throw new Error('人气点赞响应不完整');
  }

  return data as PopularityLikeData;
}

export function parseRobotPopularityLike(data: unknown): { outcome: 'ignored' } | ({ outcome: 'liked' } & PopularityLikeData) {
  if (!data || typeof data !== 'object' || !('outcome' in data)) {
    throw new Error('人气点赞响应不完整');
  }
  if (data.outcome === 'ignored') {
    return { outcome: 'ignored' };
  }
  if (data.outcome !== 'liked') {
    throw new Error('人气点赞响应不完整');
  }

  return { outcome: 'liked', ...parseBackendPopularityLike(data) };
}
