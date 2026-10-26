import type { DeleteFriendResult, FriendRemovalTarget } from './friend-removal';
import type { FriendRequestMutationResult } from './friend-request-mutation';
import type { TeamPositionUpdateResult } from './team-position';
import type { TeamLeadershipTransferResult } from './team-leadership-transfer';
export type TargetSelector = { targetUid: string; targetBid?: never } | { targetUid?: never; targetBid: string } | { targetUid?: never; targetBid?: never };
export type FriendWorkflowInput = TargetSelector & { action: 'request' | 'remove'; confirmed?: boolean };
export type FriendWorkflowResult = {
  outcome: 'locked' | 'target_invalid' | 'target_missing' | 'confirmation_required' | 'result';
  realmName: string | null;
  targetId: string;
  target: FriendRemovalTarget | null;
  request?: FriendRequestMutationResult;
  removal?: DeleteFriendResult;
};
export type TeamWorkflowInput = (({ action: 'position'; position: number } | { action: 'leadership' }) & TargetSelector) | { action: 'applications' };
export type TeamApplicationOverview = {
  records: {
    isLeader: boolean;
    canUseSecondLayerFeature: boolean;
    realmName: string;
    applications: Array<{ id: number; leaderName: string | null; createdAt: string | null }>;
  };
  pending: { leaderName: string | null; applications: Array<{ id: number; userId: number; userName: string | null }> } | null;
};
export type TeamWorkflowResult = TeamPositionUpdateResult | TeamLeadershipTransferResult | { outcome: 'target_missing' } | TeamApplicationOverview;
export type MasterProposalDecisionInput = { kind: 'binding' | 'graduation'; discipleId: number; accept: boolean };
export type MasterProposalDecisionResult = { message: string };
