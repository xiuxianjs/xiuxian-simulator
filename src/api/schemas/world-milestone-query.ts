export type WorldMilestoneDisplay = {
  milestoneCount: number;
  status: string;
  rewardText: string;
};

export type WorldMilestoneViewResult =
  | { code: 'EMPTY' }
  | {
      code: 'VIEW';
      worldCountText: string;
      nextMilestoneCount: number | null;
      nextMilestoneGapText: string;
      unclaimedCount: number;
      milestones: WorldMilestoneDisplay[];
    };
