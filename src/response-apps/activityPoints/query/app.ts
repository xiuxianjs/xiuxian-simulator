import { getBackendActivityPoints } from '@src/api/bot/activity-points-queries';
import { displayCurrencyText } from '@src/constants/currency';
import type { CodeResult } from '@src/types/result';
import { logger } from 'alemonjs';

export type ActivityPointsTaskItem = {
  taskId: number;
  name: string;
  description: string;
  activityPoints: number;
  targetValue: number;
  currentValue: number;
  completed: boolean;
  rewardName: string;
  rewardQuantity: number;
};

export type ActivityPointsRewardItem = {
  requiredPoints: number;
  name: string;
  quantity: number;
  category: string;
  claimed: boolean;
  canClaim: boolean;
};

export type ActivityPointsPageData = {
  currentPoints: number;
  tasks: ActivityPointsTaskItem[];
  rewards: ActivityPointsRewardItem[];
};

export type ActivityPointsPageResult = CodeResult<'OK', 'INVALID_USER' | 'LOAD_FAILED', ActivityPointsPageData>;

export default async function App(params: { uid?: number; bid?: string; type: 'daily' | 'weekly' }): Promise<ActivityPointsPageResult> {
  if (!params.uid) {
    return { code: 'INVALID_USER' };
  }

  try {
    const rewardInfo = await getBackendActivityPoints(params.bid, params.uid, params.type);
    const tasks = rewardInfo.tasks;

    return {
      code: 'OK',
      data: {
        currentPoints: rewardInfo.currentPoints,
        tasks: tasks.map(task => ({
          taskId: task.taskId,
          name: task.name,
          description: task.description,
          activityPoints: task.activityPoints,
          targetValue: task.targetValue,
          currentValue: task.currentValue,
          completed: task.completed,
          rewardName: task.rewardName ?? '',
          rewardQuantity: task.rewardQuantity
        })),
        rewards: rewardInfo.rewards.map(reward => ({
          requiredPoints: reward.requiredPoints,
          name: displayCurrencyText(reward.name),
          quantity: reward.quantity,
          category: reward.category,
          claimed: reward.claimed,
          canClaim: reward.canClaim
        }))
      }
    };
  } catch (error) {
    logger.error(`查看${params.type === 'daily' ? '日常' : '周常'}活跃失败:`, error);

    return { code: 'LOAD_FAILED' };
  }
}
