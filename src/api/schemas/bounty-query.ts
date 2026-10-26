export interface BountyQueryItem {
  id: number;
  publisherName: string | null;
  targetName: string | null;
  targetUid: number;
  rewardPerCompletion: number;
  maxCompletions: number;
  completedCount: number;
  remainingSlots: number;
  expiresAt: string;
  hoursLeft: number;
}
export interface BountyQueryPage {
  items: BountyQueryItem[];
  total: number;
  page: number;
  pageSize: number;
}
