import { requestBackend } from '../../src/api/bot/client';
import type { StorylineCatalogQueryData } from '../../src/api/schemas/storyline-catalog-query';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('主线目录接口数据不完整');
  }

  return value as Record<string, unknown>;
}
function numbers(row: Record<string, unknown>, keys: string[]) {
  if (keys.some(key => typeof row[key] !== 'number' || !Number.isFinite(row[key]))) {
    throw new Error('主线目录接口数值不完整');
  }
}
function texts(row: Record<string, unknown>, keys: string[]) {
  if (keys.some(key => typeof row[key] !== 'string')) {
    throw new Error('主线目录接口文本不完整');
  }
}
function bools(row: Record<string, unknown>, keys: string[]) {
  if (keys.some(key => typeof row[key] !== 'boolean')) {
    throw new Error('主线目录接口状态不完整');
  }
}
function list(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error('主线目录接口列表不完整');
  }

  return value.map(object);
}
export async function getBackendStorylineCatalog(
  bid: string | undefined,
  uid: number,
  chapterNumber: number | null,
  page: number
): Promise<StorylineCatalogQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = object(
    await requestBackend(bid, 'get_players_id_storyline_catalog', {
      path: { id: uid },
      query: { ...(chapterNumber === null ? {} : { chapterNumber }), page: Math.max(1, page) }
    })
  );

  numbers(data, ['mentalValue']);
  bools(data, ['canUseMeridian', 'canUseSecondLayerFeature', 'inTeam']);
  if (chapterNumber === null) {
    if (data.detail !== null) {
      throw new Error('主线目录模式不一致');
    }
    const overview = object(data.overview);

    numbers(overview, [
      'totalClaimableChests',
      'currentPage',
      'totalPages',
      'totalCount',
      'milestoneTotalStars',
      'milestoneTotal',
      'milestoneClaimed',
      'milestoneClaimable'
    ]);
    texts(overview, ['achievementLabel']);
    bools(overview, ['showClaimAllChests']);
    for (const ch of list(overview.chapters)) {
      texts(ch, ['name', 'arc', 'starsText', 'progressText', 'chestIcon']);
      numbers(ch, ['chapterNumber', 'totalStars', 'maxStars', 'clearedCount', 'stageCount', 'claimableChestCount']);
    }
  } else {
    if (data.overview !== null) {
      throw new Error('主线目录模式不一致');
    }
    const detail = object(data.detail);

    if (typeof detail.status !== 'string' || !['OK', 'NOT_FOUND', 'LOCKED', 'NO_STAGES'].includes(detail.status)) {
      throw new Error('章节状态无效');
    }
    texts(detail, ['chapterName', 'arc', 'statusMessage']);
    numbers(detail, ['chapterNumber', 'totalStars', 'maxStars', 'canClaimChestCount', 'maxChapterNumber']);
    bools(detail, ['eliteStagesCleared', 'showPrevChapter', 'showNextChapter']);
    for (const chest of list(detail.chests)) {
      numbers(chest, ['index', 'requiredStars', 'reward']);
      bools(chest, ['claimed', 'unlocked']);
    }
    for (const stage of list(detail.stages)) {
      texts(stage, ['stageLabel', 'monsterDisplayName', 'rewardText', 'starsDisplay']);
      numbers(stage, ['id', 'stageNumber', 'spiritCost', 'expReward', 'spiritStoneReward', 'bestStars', 'dailyUsed', 'dailyLimit', 'maxSweepTimes']);
      bools(stage, ['isElite', 'canSweep', 'showBulkSweep', 'canMatch']);
      if (stage.monsterName !== null && typeof stage.monsterName !== 'string') {
        throw new Error('关卡NPC名称无效');
      }
      for (const drop of list(stage.drops)) {
        texts(drop, ['category']);
        numbers(drop, ['amount', 'probability']);
        if (drop.itemId !== null) {
          numbers(drop, ['itemId']);
        }
        for (const key of ['currencyType', 'itemName']) {
          if (drop[key] !== null && typeof drop[key] !== 'string') {
            throw new Error('掉落名称无效');
          }
        }
      }
    }
  }

  return data as StorylineCatalogQueryData;
}
