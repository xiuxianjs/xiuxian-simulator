import type { TeamWorkflowInput, TeamWorkflowResult } from '../../schemas/social-workflows';
import type { TeamLeadershipTransferResult } from '../../schemas/team-leadership-transfer';
import type { TeamInvitationCancelResult } from '../../schemas/team-invitation-cancel';
import type { TeamRealmUpdateResult } from '../../schemas/team-realm-update';
import type { TeamCancelApplicationResult } from '../../schemas/team-application-cancel';
import type { TeamMatchSnapshot } from '../../schemas/team-match-snapshot';
import type { TeamInfoQueryData } from '../../schemas/team-info-query';
import type { TeamApplicationRecordsData } from '../../schemas/queries';
import type { TeamPendingData } from '../../schemas/queries';
import type { TeamBattleRecordsData, TeamBattleDetailData } from '../../schemas/queries';
import type { TeamListData } from '../../schemas/queries';
import type { TeamPositionTargetData, TeamPositionUpdateResult } from '../../schemas/team-position';
import type { TeamMatchCancelResult } from '../../schemas/team-match-cancel';
import type { TeamInvitationInbox } from '../../schemas/team-invitation-inbox';
// Contract maintained against Go docs/openapi.yaml; verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface TeamsOperations {
  post_players_id_team_workflow: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: TeamWorkflowInput;
    response: TeamWorkflowResult;
  };
  patch_players_id_team_min_realm: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: { realmName: string | null };
    response: TeamRealmUpdateResult;
  };
  get_teams_match_snapshot: { path: never; query: never; headers: never; body: never; response: TeamMatchSnapshot | null };
  post_teams_match_command_guard: {
    path: never;
    query: never;
    headers: never;
    body: { messageText: string };
    response: { blocked: boolean; match?: TeamMatchSnapshot };
  };
  get_players_id_team_overview: { path: { id: number }; query: never; headers: never; body: never; response: TeamInfoQueryData };
  get_players_id_team_application_records: { path: { id: number }; query: never; headers: never; body: never; response: TeamApplicationRecordsData };
  get_players_id_team_pending_applications: { path: { id: number }; query: never; headers: never; body: never; response: TeamPendingData };
  get_teams_battle_records: { path: never; query: { page?: number; pageSize?: number }; headers: never; body: never; response: TeamBattleRecordsData };
  get_teams_battle_records_recordId: { path: { recordId: number }; query: never; headers: never; body: never; response: TeamBattleDetailData };
  get_teams: { path: never; query: { page?: number; pageSize?: number }; headers: never; body: never; response: TeamListData };
  post_teams: {
    path: never;
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_teams_teamId: { path: { teamId: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: TeamInfoQueryData };
  get_teams_mine: { path: never; query: never; headers: never; body: never; response: TeamInfoQueryData };
  delete_teams_mine: {
    path: never;
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  delete_teams_members_memberId: {
    path: { memberId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  patch_teams_members_memberId_position: {
    path: { memberId: string };
    query: never;
    headers: { 'Idempotency-Key'?: string };
    body: { position: number };
    response: TeamPositionUpdateResult;
  };
  get_teams_position_target: { path: never; query: { targetBid: string }; headers: never; body: never; response: TeamPositionTargetData };
  post_teams_leadership_transfer: { path: never; query: never; headers: never; body: { targetId: string }; response: TeamLeadershipTransferResult };
  post_teams_teamId_join: {
    path: { teamId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  get_teams_teamId_applications: { path: { teamId: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_teams_teamId_applications: {
    path: { teamId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_teams_applications: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_teams_invitations: { path: never; query: never; headers: never; body: never; response: unknown };
  post_players_id_team_invitations_refresh: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: TeamInvitationInbox;
  };
  post_teams_invitations: {
    path: never;
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { inviteeId: number };
    response: unknown;
  };
  post_teams_invitations_invitationId_accept: {
    path: { invitationId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  delete_teams_invitations_invitationId: {
    path: { invitationId: string };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: TeamInvitationCancelResult;
  };
  post_teams_invitations_invitationId_reject: {
    path: { invitationId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  delete_teams_applications_applicationId: {
    path: { applicationId: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: TeamCancelApplicationResult;
  };
  post_teams_applications_applicationId_approve: {
    path: { applicationId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_teams_applications_applicationId_reject: {
    path: { applicationId: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_teams_leave: {
    path: never;
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_teams_match: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_teams_match: {
    path: never;
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { mode: 'mainline' | 'dungeon'; targetId?: number; chapterNumber?: number; stageNumber?: number };
    response: unknown;
  };
  post_teams_match_cancel: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: TeamMatchCancelResult };
}
