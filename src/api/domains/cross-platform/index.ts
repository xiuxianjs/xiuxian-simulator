import type { APIClient, RequestArguments } from '../../core/index.js';
export type { CrossPlatformOperations } from './types.js';
export { crossPlatformOperationDefinitions } from './operations.js';
export function createCrossPlatformApi(client: APIClient) {
  return {
    post_players_id_tasks_config_actions: (...args: RequestArguments<'post_players_id_tasks_config_actions'>) => client.request('post_players_id_tasks_config_actions', ...args),
    post_players_id_tasks_slots_slot_steps: (...args: RequestArguments<'post_players_id_tasks_slots_slot_steps'>) => client.request('post_players_id_tasks_slots_slot_steps', ...args),
    put_players_id_tasks_slots_slot_alias: (...args: RequestArguments<'put_players_id_tasks_slots_slot_alias'>) => client.request('put_players_id_tasks_slots_slot_alias', ...args),
    post_players_id_tasks_runtime_actions: (...args: RequestArguments<'post_players_id_tasks_runtime_actions'>) => client.request('post_players_id_tasks_runtime_actions', ...args),
    get_players_id_tasks: (...args: RequestArguments<'get_players_id_tasks'>) => client.request('get_players_id_tasks', ...args),
    get_players_id_tasks_limits: (...args: RequestArguments<'get_players_id_tasks_limits'>) => client.request('get_players_id_tasks_limits', ...args),
    put_players_id_tasks: (...args: RequestArguments<'put_players_id_tasks'>) => client.request('put_players_id_tasks', ...args),
    get_players_id_tasks_runtime: (...args: RequestArguments<'get_players_id_tasks_runtime'>) => client.request('get_players_id_tasks_runtime', ...args),
    put_players_id_tasks_runtime: (...args: RequestArguments<'put_players_id_tasks_runtime'>) => client.request('put_players_id_tasks_runtime', ...args),
    delete_players_id_tasks_runtime: (...args: RequestArguments<'delete_players_id_tasks_runtime'>) => client.request('delete_players_id_tasks_runtime', ...args)
  };
}
