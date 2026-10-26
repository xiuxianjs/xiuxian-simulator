import { BackendAPIError } from './client';
import { parseBackendActivityPoints } from './activity-points-queries';
import { parseBackendActivityClaim, parseBackendActivityClaimAll } from './activity-points-claim';
import { displayCurrencyText } from '@src/constants/currency';

export function parseRobotActivityPoints(value: unknown, type: 'daily' | 'weekly') {
  const data = parseBackendActivityPoints(value, type);

  return {
    currentPoints: data.currentPoints,
    taskRewardsCanClaim: data.taskRewardsCanClaim ?? false,
    tasks: data.tasks.map(task => ({
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
    rewards: data.rewards.map(reward => ({
      requiredPoints: reward.requiredPoints,
      name: displayCurrencyText(reward.name),
      quantity: reward.quantity,
      category: reward.category,
      claimed: reward.claimed,
      canClaim: reward.canClaim
    }))
  };
}
export function parseRobotActivityClaim(value: unknown) {
  const data = parseBackendActivityClaim(value);

  return {
    userName: data.userName,
    requiredPoints: data.requiredPoints,
    rewards: data.issued.map(reward => ({ name: displayCurrencyText(reward.name), amount: reward.amount }))
  };
}
export function parseRobotActivityClaimAll(value: unknown) {
  const data = parseBackendActivityClaimAll(value);

  return {
    userName: data.claimed[0]?.userName ?? data.userName ?? '',
    taskRewards: (data.taskRewards ?? []).map(reward => ({ name: displayCurrencyText(reward.name), amount: reward.amount })),
    partial: data.partial,
    claimed: data.claimed.map(item => ({
      requiredPoints: item.requiredPoints,
      rewards: item.issued.map(reward => ({ name: displayCurrencyText(reward.name), amount: reward.amount }))
    })),
    ...(data.error ? { error: data.error } : {})
  };
}

export function activityClaimFailureText(error: unknown, type: 'daily' | 'weekly', requiredPoints: number) {
  const label = type === 'daily' ? '日常' : '周常';

  if (error instanceof BackendAPIError) {
    const reasons: Record<string, string> = {
      IDEMPOTENCY_IN_PROGRESS: '操作繁忙，请稍后再试。',
      ACTIVITY_ALREADY_CLAIMED: `${label}活跃度 ${requiredPoints} 点奖励已领取。`,
      ACTIVITY_INSUFFICIENT_POINTS: `${label}活跃度不足，当前活跃度未达到 ${requiredPoints} 点。`,
      ACTIVITY_REWARD_NOT_FOUND: '未找到对应的活跃度奖励配置。',
      NOT_FOUND: '未找到用户信息。'
    };

    if (reasons[error.code]) {
      return reasons[error.code];
    }
  }

  return `领取${label}活跃奖励失败，请稍后再试。`;
}
