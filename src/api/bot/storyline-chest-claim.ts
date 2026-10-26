import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

export type StorylineChest = { index: number; requiredStars: number; reward: number; claimed: boolean; unlocked: boolean };
export type StorylineChapterChestClaim = {
  success: boolean;
  message: string;
  chapterNumber: number;
  claimedIndexes: number[];
  totalReward: number;
  chests: StorylineChest[];
};
export type StorylineAllChestClaim = {
  success: boolean;
  message: string;
  totalReward: number;
  claimedCount: number;
  details: Array<{ chapterNumber: number; chapterName: string; claimed: number[]; reward: number }>;
};

function row(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('主线宝箱响应不完整');
  }

  return value as Record<string, unknown>;
}
function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function numberList(value: unknown): number[] {
  if (!Array.isArray(value) || value.some(item => !positiveInteger(item))) {
    throw new Error('主线宝箱序号响应不完整');
  }

  return value as number[];
}
function chests(value: unknown): StorylineChest[] {
  if (!Array.isArray(value)) {
    throw new Error('主线宝箱状态响应不完整');
  }

  return value.map(value => {
    const item = row(value);

    if (
      !positiveInteger(item.index) ||
      !positiveInteger(item.requiredStars) ||
      !positiveInteger(item.reward) ||
      typeof item.claimed !== 'boolean' ||
      typeof item.unlocked !== 'boolean'
    ) {
      throw new Error('主线宝箱状态字段不完整');
    }

    return { index: item.index, requiredStars: item.requiredStars, reward: item.reward, claimed: item.claimed, unlocked: item.unlocked };
  });
}
export function parseStorylineChapterChestClaim(value: unknown): StorylineChapterChestClaim {
  const item = row(value);

  if (typeof item.success !== 'boolean' || typeof item.message !== 'string' || !positiveInteger(item.chapterNumber) || !positiveInteger(item.totalReward)) {
    throw new Error('主线章节宝箱响应不完整');
  }

  return {
    success: item.success,
    message: item.message,
    chapterNumber: item.chapterNumber,
    claimedIndexes: numberList(item.claimedIndexes),
    totalReward: item.totalReward,
    chests: chests(item.chests)
  };
}
export function parseStorylineAllChestClaim(value: unknown): StorylineAllChestClaim {
  const item = row(value);

  if (
    typeof item.success !== 'boolean' ||
    typeof item.message !== 'string' ||
    !positiveInteger(item.totalReward) ||
    !positiveInteger(item.claimedCount) ||
    !Array.isArray(item.details)
  ) {
    throw new Error('主线全章节宝箱响应不完整');
  }
  const details = item.details.map(value => {
    const detail = row(value);

    if (!positiveInteger(detail.chapterNumber) || typeof detail.chapterName !== 'string' || !positiveInteger(detail.reward)) {
      throw new Error('主线全章节宝箱明细不完整');
    }

    return { chapterNumber: detail.chapterNumber, chapterName: detail.chapterName, claimed: numberList(detail.claimed), reward: detail.reward };
  });

  if (details.reduce((sum, detail) => sum + detail.claimed.length, 0) !== item.claimedCount) {
    throw new Error('主线全章节宝箱计数不一致');
  }

  return { success: item.success, message: item.message, totalReward: item.totalReward, claimedCount: item.claimedCount, details };
}
function requireParams(bid: string | undefined, uid: number): asserts bid is string {
  if (!bid?.trim() || !Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('主线宝箱操作参数无效');
  }
}

export async function claimBackendStorylineChest(
  bid: string | undefined,
  uid: number,
  chapterNumber: number,
  chestIndex: number,
  request?: BackendRequestContext
): Promise<StorylineChapterChestClaim> {
  requireParams(bid, uid);

  return parseStorylineChapterChestClaim(
    await requestBackend(bid, 'post_players_id_storyline_chapters_chapterNumber_chests_chestIndex_claim', {
      path: { id: uid, chapterNumber, chestIndex },
      headers: repeatPresentationHeaders('领取宝箱'),
      ...writeContext(request)
    })
  );
}

export async function claimAllBackendChapterChests(
  bid: string | undefined,
  uid: number,
  chapterNumber: number,
  request?: BackendRequestContext
): Promise<StorylineChapterChestClaim> {
  requireParams(bid, uid);

  return parseStorylineChapterChestClaim(
    await requestBackend(bid, 'post_players_id_storyline_chapters_chapterNumber_chests_claim_all', {
      path: { id: uid, chapterNumber },
      headers: repeatPresentationHeaders('领取宝箱'),
      ...writeContext(request)
    })
  );
}

export async function claimAllBackendStorylineChests(bid: string | undefined, uid: number, request?: BackendRequestContext): Promise<StorylineAllChestClaim> {
  requireParams(bid, uid);

  return parseStorylineAllChestClaim(
    await requestBackend(bid, 'post_players_id_storyline_chests_claim_all', {
      path: { id: uid },
      headers: repeatPresentationHeaders('一键领取宝箱'),
      ...writeContext(request)
    })
  );
}
