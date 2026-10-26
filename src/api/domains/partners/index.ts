// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { PartnersOperations } from './types.js';
export { partnersOperationDefinitions } from './operations.js';

export function createPartnersApi(client: APIClient) {
  return {
    post_players_id_companion_shop_purchases_preview: (...args: RequestArguments<'post_players_id_companion_shop_purchases_preview'>) => {
      return client.request('post_players_id_companion_shop_purchases_preview', ...args);
    },
    post_players_id_companion_shop_purchases: (...args: RequestArguments<'post_players_id_companion_shop_purchases'>) => {
      return client.request('post_players_id_companion_shop_purchases', ...args);
    },
    get_players_id_companion_proposal_preflight: (...args: RequestArguments<'get_players_id_companion_proposal_preflight'>) => {
      return client.request('get_players_id_companion_proposal_preflight', ...args);
    },
    get_players_id_companion: (...args: RequestArguments<'get_players_id_companion'>) => {
      return client.request('get_players_id_companion', ...args);
    },
    delete_players_id_companion: (...args: RequestArguments<'delete_players_id_companion'>) => {
      return client.request('delete_players_id_companion', ...args);
    },
    post_players_id_companion_proposals: (...args: RequestArguments<'post_players_id_companion_proposals'>) => {
      return client.request('post_players_id_companion_proposals', ...args);
    },
    post_players_id_companion_proposals_proposerId_accept: (...args: RequestArguments<'post_players_id_companion_proposals_proposerId_accept'>) => {
      return client.request('post_players_id_companion_proposals_proposerId_accept', ...args);
    },
    post_players_id_companion_proposals_proposerId_reject: (...args: RequestArguments<'post_players_id_companion_proposals_proposerId_reject'>) => {
      return client.request('post_players_id_companion_proposals_proposerId_reject', ...args);
    },
    get_players_id_companion_tasks: (...args: RequestArguments<'get_players_id_companion_tasks'>) => {
      return client.request('get_players_id_companion_tasks', ...args);
    },
    get_players_id_companion_panel_status: (...args: RequestArguments<'get_players_id_companion_panel_status'>) => {
      return client.request('get_players_id_companion_panel_status', ...args);
    },
    get_players_id_companion_oath_items: (...args: RequestArguments<'get_players_id_companion_oath_items'>) => {
      return client.request('get_players_id_companion_oath_items', ...args);
    },
    get_players_id_companion_oath_upgrade: (...args: RequestArguments<'get_players_id_companion_oath_upgrade'>) => {
      return client.request('get_players_id_companion_oath_upgrade', ...args);
    },
    post_players_id_companion_oath_upgrade: (...args: RequestArguments<'post_players_id_companion_oath_upgrade'>) => {
      return client.request('post_players_id_companion_oath_upgrade', ...args);
    },
    post_players_id_companion_dual_cultivation: (...args: RequestArguments<'post_players_id_companion_dual_cultivation'>) => {
      return client.request('post_players_id_companion_dual_cultivation', ...args);
    },
    get_players_id_companion_gifts: (...args: RequestArguments<'get_players_id_companion_gifts'>) => {
      return client.request('get_players_id_companion_gifts', ...args);
    },
    post_players_id_companion_gifts: (...args: RequestArguments<'post_players_id_companion_gifts'>) => {
      return client.request('post_players_id_companion_gifts', ...args);
    }
  };
}
