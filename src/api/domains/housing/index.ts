// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { HousingOperations } from './types.js';
export { housingOperationDefinitions } from './operations.js';

export function createHousingApi(client: APIClient) {
  return {
    post_players_id_cave_command: (...args: RequestArguments<'post_players_id_cave_command'>) => client.request('post_players_id_cave_command', ...args),
    get_players_id_cave_plant_query: (...args: RequestArguments<'get_players_id_cave_plant_query'>) => client.request('get_players_id_cave_plant_query', ...args),
    get_players_id_cave_view: (...args: RequestArguments<'get_players_id_cave_view'>) => client.request('get_players_id_cave_view', ...args),
    get_players_id_professions_lingzhi_guide: (...args: RequestArguments<'get_players_id_professions_lingzhi_guide'>) => {
      return client.request('get_players_id_professions_lingzhi_guide', ...args);
    },
    post_players_id_professions_lingzhi_guide_start: (...args: RequestArguments<'post_players_id_professions_lingzhi_guide_start'>) => {
      return client.request('post_players_id_professions_lingzhi_guide_start', ...args);
    },
    post_players_id_professions_lingzhi_guide_continue: (...args: RequestArguments<'post_players_id_professions_lingzhi_guide_continue'>) => {
      return client.request('post_players_id_professions_lingzhi_guide_continue', ...args);
    },
    get_players_id_professions_lingzhi_guide_start_facts: (...args: RequestArguments<'get_players_id_professions_lingzhi_guide_start_facts'>) => {
      return client.request('get_players_id_professions_lingzhi_guide_start_facts', ...args);
    },
    post_players_id_professions_lingzhi_activate: (...args: RequestArguments<'post_players_id_professions_lingzhi_activate'>) => {
      return client.request('post_players_id_professions_lingzhi_activate', ...args);
    },
    get_players_id_cave_access: (...args: RequestArguments<'get_players_id_cave_access'>) => {
      return client.request('get_players_id_cave_access', ...args);
    },
    get_players_id_cave: (...args: RequestArguments<'get_players_id_cave'>) => {
      return client.request('get_players_id_cave', ...args);
    },
    get_players_id_cave_plant_options: (...args: RequestArguments<'get_players_id_cave_plant_options'>) => {
      return client.request('get_players_id_cave_plant_options', ...args);
    },
    get_players_id_cave_formations: (...args: RequestArguments<'get_players_id_cave_formations'>) => {
      return client.request('get_players_id_cave_formations', ...args);
    },
    post_players_id_cave_formations_activate: (...args: RequestArguments<'post_players_id_cave_formations_activate'>) => {
      return client.request('post_players_id_cave_formations_activate', ...args);
    },
    delete_players_id_cave_formations_category: (...args: RequestArguments<'delete_players_id_cave_formations_category'>) => {
      return client.request('delete_players_id_cave_formations_category', ...args);
    },
    post_players_id_cave_plots_plant: (...args: RequestArguments<'post_players_id_cave_plots_plant'>) => {
      return client.request('post_players_id_cave_plots_plant', ...args);
    },
    post_players_id_cave_plots_care: (...args: RequestArguments<'post_players_id_cave_plots_care'>) => {
      return client.request('post_players_id_cave_plots_care', ...args);
    },
    post_players_id_cave_plots_harvest: (...args: RequestArguments<'post_players_id_cave_plots_harvest'>) => {
      return client.request('post_players_id_cave_plots_harvest', ...args);
    },
    post_players_id_cave_plots_accelerate: (...args: RequestArguments<'post_players_id_cave_plots_accelerate'>) => {
      return client.request('post_players_id_cave_plots_accelerate', ...args);
    },
    get_players_id_cave_logs: (...args: RequestArguments<'get_players_id_cave_logs'>) => {
      return client.request('get_players_id_cave_logs', ...args);
    },
    get_players_id_cave_visit_ownerId: (...args: RequestArguments<'get_players_id_cave_visit_ownerId'>) => {
      return client.request('get_players_id_cave_visit_ownerId', ...args);
    },
    get_players_id_cave_nearby: (...args: RequestArguments<'get_players_id_cave_nearby'>) => {
      return client.request('get_players_id_cave_nearby', ...args);
    },
    post_players_id_cave_plots_cultivate: (...args: RequestArguments<'post_players_id_cave_plots_cultivate'>) => {
      return client.request('post_players_id_cave_plots_cultivate', ...args);
    },
    post_players_id_cave_plots_upgrade: (...args: RequestArguments<'post_players_id_cave_plots_upgrade'>) => {
      return client.request('post_players_id_cave_plots_upgrade', ...args);
    },
    post_players_id_cave_collaborations: (...args: RequestArguments<'post_players_id_cave_collaborations'>) => {
      return client.request('post_players_id_cave_collaborations', ...args);
    },
    post_players_id_cave_steals: (...args: RequestArguments<'post_players_id_cave_steals'>) => {
      return client.request('post_players_id_cave_steals', ...args);
    }
  };
}
