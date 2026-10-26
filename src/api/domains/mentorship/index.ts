// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { MentorshipOperations } from './types.js';
export { mentorshipOperationDefinitions } from './operations.js';

export function createMentorshipApi(client: APIClient) {
  return {
    post_players_id_master_proposal_decision: (...args: RequestArguments<'post_players_id_master_proposal_decision'>) => client.request('post_players_id_master_proposal_decision', ...args),
    get_players_id_master_lineage: (...args: RequestArguments<'get_players_id_master_lineage'>) => {
      return client.request('get_players_id_master_lineage', ...args);
    },
    post_players_id_master_apply: (...args: RequestArguments<'post_players_id_master_apply'>) => {
      return client.request('post_players_id_master_apply', ...args);
    },
    get_players_id_master_proposals: (...args: RequestArguments<'get_players_id_master_proposals'>) => {
      return client.request('get_players_id_master_proposals', ...args);
    },
    post_players_id_master_proposals_proposalId_accept: (...args: RequestArguments<'post_players_id_master_proposals_proposalId_accept'>) => {
      return client.request('post_players_id_master_proposals_proposalId_accept', ...args);
    },
    post_players_id_master_teach_discipleId: (...args: RequestArguments<'post_players_id_master_teach_discipleId'>) => {
      return client.request('post_players_id_master_teach_discipleId', ...args);
    },
    post_players_id_master_bless_discipleId: (...args: RequestArguments<'post_players_id_master_bless_discipleId'>) => {
      return client.request('post_players_id_master_bless_discipleId', ...args);
    },
    post_players_id_master_gift_discipleId: (...args: RequestArguments<'post_players_id_master_gift_discipleId'>) => {
      return client.request('post_players_id_master_gift_discipleId', ...args);
    },
    post_players_id_master_graduation: (...args: RequestArguments<'post_players_id_master_graduation'>) => {
      return client.request('post_players_id_master_graduation', ...args);
    },
    get_players_id_master_graduation_proposals: (...args: RequestArguments<'get_players_id_master_graduation_proposals'>) => {
      return client.request('get_players_id_master_graduation_proposals', ...args);
    },
    post_players_id_master_graduation_proposals_proposalId_accept: (
      ...args: RequestArguments<'post_players_id_master_graduation_proposals_proposalId_accept'>
    ) => {
      return client.request('post_players_id_master_graduation_proposals_proposalId_accept', ...args);
    },
    post_players_id_master_graduation_proposals_proposalId_reject: (
      ...args: RequestArguments<'post_players_id_master_graduation_proposals_proposalId_reject'>
    ) => {
      return client.request('post_players_id_master_graduation_proposals_proposalId_reject', ...args);
    },
    post_players_id_master_rebel: (...args: RequestArguments<'post_players_id_master_rebel'>) => {
      return client.request('post_players_id_master_rebel', ...args);
    },
    post_players_id_master_disciples_discipleId_expel: (...args: RequestArguments<'post_players_id_master_disciples_discipleId_expel'>) => {
      return client.request('post_players_id_master_disciples_discipleId_expel', ...args);
    },
    get_players_id_master_info: (...args: RequestArguments<'get_players_id_master_info'>) => {
      return client.request('get_players_id_master_info', ...args);
    },
    post_players_id_master_title_claim: (...args: RequestArguments<'post_players_id_master_title_claim'>) => {
      return client.request('post_players_id_master_title_claim', ...args);
    },
    get_players_id_master_ranking: (...args: RequestArguments<'get_players_id_master_ranking'>) => {
      return client.request('get_players_id_master_ranking', ...args);
    }
  };
}
