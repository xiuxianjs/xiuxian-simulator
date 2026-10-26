import { getCommandErrorMessage } from '@src/utils/commandError';
import { getBackendStorylineCatalog } from '@src/api/bot/storyline-catalog-queries';
import { logger } from 'alemonjs';

export type StorylineOverviewChapter = {
  chapterNumber: number;
  name: string;
  arc: string;
  totalStars: number;
  maxStars: number;
  clearedCount: number;
  stageCount: number;
  claimableChestCount: number;
  starsText: string;
  progressText: string;
  chestIcon: string;
};

export type StorylineOverviewArc = {
  arc: string;
  chapters: StorylineOverviewChapter[];
};

export type StorylineDetailStage = {
  id: number;
  stageLabel: string;
  monsterName: string | null;
  isElite: boolean;
  spiritCost: number;
  expReward: number;
  spiritStoneReward: number;
  bestStars: number;
  dailyUsed: number;
  dailyLimit: number;
  rewardText: string;
  maxSweepTimes: number;
  monsterDisplayName: string;
  starsDisplay: string;
  canSweep: boolean;
  showBulkSweep: boolean;
  canMatch: boolean;
};

export type StorylineDetailChest = {
  index: number;
  requiredStars: number;
  reward: number;
  claimed: boolean;
  unlocked: boolean;
};

type StorylineListPayload =
  | {
      code: 'OVERVIEW';
      data: {
        mentalValue: number;
        arcs: StorylineOverviewArc[];
        totalClaimableChests: number;
        showClaimAllChests: boolean;
        achievementLabel: string;
        currentPage: number;
        totalPages: number;
        totalCount: number;
        milestoneTotalStars: number;
        milestoneTotal: number;
        milestoneClaimed: number;
        milestoneClaimable: number;
      };
    }
  | {
      code: 'DETAIL';
      data: {
        mentalValue: number;
        chapterNumber: number;
        chapterName: string;
        arc: string;
        totalStars: number;
        maxStars: number;
        stages: StorylineDetailStage[];
        chests: StorylineDetailChest[];
        canClaimChestCount: number;
        showPrevChapter: boolean;
        showNextChapter: boolean;
      };
    }
  | { code: 'DETAIL_FAILED'; data: { message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

type StorylineAccess = { canUseMeridian: boolean; canUseSecondLayerFeature: boolean; inTeam: boolean };
export type StorylineListResult = StorylineListPayload & { access: StorylineAccess };
export default async function App(params: { uid: number; bid?: string; chapterArg: number | null; pageArg: number | null }): Promise<StorylineListResult> {
  let access: StorylineAccess = { canUseMeridian: false, canUseSecondLayerFeature: false, inTeam: false };

  try {
    const data = await getBackendStorylineCatalog(params.bid, params.uid, params.chapterArg, params.pageArg ?? 1);

    access = { canUseMeridian: data.canUseMeridian, canUseSecondLayerFeature: data.canUseSecondLayerFeature, inTeam: data.inTeam };
    if (data.overview) {
      const { chapters, ...overview } = data.overview;
      const arcOrder = [...new Set(chapters.map(chapter => chapter.arc))];

      return {
        code: 'OVERVIEW',
        access,
        data: { ...overview, mentalValue: data.mentalValue, arcs: arcOrder.map(arc => ({ arc, chapters: chapters.filter(chapter => chapter.arc === arc) })) }
      };
    }
    const detail = data.detail!;

    if (detail.status !== 'OK') {
      return { code: 'DETAIL_FAILED', access, data: { message: detail.statusMessage } };
    }

    return {
      code: 'DETAIL',
      access,
      data: {
        ...detail,
        mentalValue: data.mentalValue,
        stages: detail.stages
      }
    };
  } catch (error) {
    logger.error('查询主线失败:', error);

    return { code: 'LOAD_FAILED', access, data: { message: getCommandErrorMessage(error) } };
  }
}
