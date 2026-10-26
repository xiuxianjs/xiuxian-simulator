export interface TeamInfoMemberFact {
  userId: number;
  name: string | null;
  isLeader: boolean;
  position: number;
}
export interface TeamTargetFact {
  mode: 'mainline' | 'dungeon';
  targetId: number;
  name: string | null;
  teamType: 'matching_team' | 'free_team';
}
export interface TeamInfoFact {
  teamId: number;
  exists: boolean;
  leaderName: string | null;
  memberCount: number;
  maxMembers: number;
  minRealmName: string | null;
  target: TeamTargetFact | null;
  members: TeamInfoMemberFact[];
  isMember: boolean;
  isLeader: boolean;
  ownMembershipLeader: boolean;
  actions: TeamActionFacts;
}

export interface TeamActionFacts {
  canApply: boolean;
  canInvite: boolean;
  canManageMembers: boolean;
  canReviewApplications: boolean;
  canUseTeamMail: boolean;
  canViewDungeon: boolean;
  canLeave: boolean;
  canDisband: boolean;
  canViewInvitations: boolean;
}
export interface TeamInfoQueryData {
  access: { ok: boolean; realmName: string | null };
  team: TeamInfoFact | null;
}
