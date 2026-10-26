export interface ActivityPointsQueryData {
  rewardType: 'daily' | 'weekly';
  cyclePeriod: string;
  currentPoints: number;
  taskRewardsCanClaim?: boolean;
  tasks: {
    taskId: number;
    name: string;
    description: string;
    actionKey: string;
    activityPoints: number;
    targetValue: number;
    currentValue: number;
    completed: boolean;
    rewardName: string;
    rewardQuantity: number;
  }[];
  rewards: {
    requiredPoints: number;
    name: string;
    category: string;
    currencyCode: string;
    itemId: number;
    quantity: number;
    claimed: boolean;
    canClaim: boolean;
  }[];
}
