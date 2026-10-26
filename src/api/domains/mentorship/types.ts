import type { MasterProposalDecisionInput, MasterProposalDecisionResult } from '../../schemas/social-workflows';
import type { MasterInfoQueryData } from '../../schemas/master-info-query';
import type { MasterLineageQueryData } from '../../schemas/master-lineage-query';
import type { MasterRankingData } from '../../schemas/queries';
// Contract maintained against Go docs/openapi.yaml; verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface MentorshipOperations {
  post_players_id_master_proposal_decision: {
    path: { id: number };
    query: never;
    headers: { 'Idempotency-Key'?: string; 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: MasterProposalDecisionInput;
    response: MasterProposalDecisionResult;
  };
  get_players_id_master_lineage: { path: { id: number }; query: never; headers: never; body: never; response: MasterLineageQueryData };
  post_players_id_master_apply: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { masterUserId: number };
    response: unknown;
  };
  get_players_id_master_proposals: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_master_proposals_proposalId_accept: {
    path: { id: number; proposalId: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_master_teach_discipleId: {
    path: { id: number; discipleId: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_master_bless_discipleId: {
    path: { id: number; discipleId: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_master_gift_discipleId: {
    path: { id: number; discipleId: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: { itemKey?: 'peiyuan' | 'zhuji' };
    response: unknown;
  };
  post_players_id_master_graduation: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_master_graduation_proposals: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  post_players_id_master_graduation_proposals_proposalId_accept: {
    path: { id: number; proposalId: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_master_graduation_proposals_proposalId_reject: {
    path: { id: number; proposalId: number };
    query: never;
    headers: { 'X-Request-ID'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_master_rebel: {
    path: { id: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  post_players_id_master_disciples_discipleId_expel: {
    path: { id: number; discipleId: number };
    query: never;
    headers: { 'X-Request-ID'?: string; 'X-Repeat-Command'?: string };
    body: never;
    response: unknown;
  };
  get_players_id_master_info: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: MasterInfoQueryData };
  post_players_id_master_title_claim: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: unknown };
  get_players_id_master_ranking: { path: { id: number }; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: MasterRankingData };
}
