// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { InventoryOperations } from './types.js';
export { inventoryOperationDefinitions } from './operations.js';

export function createInventoryApi(client: APIClient) {
  return {
    post_players_id_mingwu_dan_confirm: (...args: RequestArguments<'post_players_id_mingwu_dan_confirm'>) => {
      return client.request('post_players_id_mingwu_dan_confirm', ...args);
    },
    post_players_id_consume: (...args: RequestArguments<'post_players_id_consume'>) => {
      return client.request('post_players_id_consume', ...args);
    },
    post_players_id_storage_lock_state: (...args: RequestArguments<'post_players_id_storage_lock_state'>) => {
      return client.request('post_players_id_storage_lock_state', ...args);
    },
    get_players_id_currencies: (...args: RequestArguments<'get_players_id_currencies'>) => {
      return client.request('get_players_id_currencies', ...args);
    },
    get_players_id_inventory: (...args: RequestArguments<'get_players_id_inventory'>) => {
      return client.request('get_players_id_inventory', ...args);
    },
    get_players_id_inventory_space: (...args: RequestArguments<'get_players_id_inventory_space'>) => {
      return client.request('get_players_id_inventory_space', ...args);
    }
  };
}
