// Contract synchronized with Go docs/openapi.yaml.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { ProfessionsOperations } from './types.js';
export { professionsOperationDefinitions } from './operations.js';

export function createProfessionsApi(client: APIClient) {
  return {
    post_players_id_professions_lingzhi_guide_continue_current: (...args: RequestArguments<'post_players_id_professions_lingzhi_guide_continue_current'>) => client.request('post_players_id_professions_lingzhi_guide_continue_current', ...args),

    get_players_id_profession_tools_bag: (...args: RequestArguments<'get_players_id_profession_tools_bag'>) => client.request('get_players_id_profession_tools_bag', ...args),
    get_players_id_professions: (...args: RequestArguments<'get_players_id_professions'>) => {
      return client.request('get_players_id_professions', ...args);
    },
    get_profession_catalog: (...args: RequestArguments<'get_profession_catalog'>) => {
      return client.request('get_profession_catalog', ...args);
    },
    get_profession_catalog_by_code_code: (...args: RequestArguments<'get_profession_catalog_by_code_code'>) => {
      return client.request('get_profession_catalog_by_code_code', ...args);
    },
    get_profession_catalog_id: (...args: RequestArguments<'get_profession_catalog_id'>) => {
      return client.request('get_profession_catalog_id', ...args);
    },
    get_profession_levels: (...args: RequestArguments<'get_profession_levels'>) => {
      return client.request('get_profession_levels', ...args);
    },
    get_players_id_professions_summary: (...args: RequestArguments<'get_players_id_professions_summary'>) => {
      return client.request('get_players_id_professions_summary', ...args);
    },

    get_profession_tools: (...args: RequestArguments<'get_profession_tools'>) => {
      return client.request('get_profession_tools', ...args);
    },
    get_profession_tool_types: (...args: RequestArguments<'get_profession_tool_types'>) => {
      return client.request('get_profession_tool_types', ...args);
    },
    get_players_id_profession_tools: (...args: RequestArguments<'get_players_id_profession_tools'>) => {
      return client.request('get_players_id_profession_tools', ...args);
    },

    post_players_id_profession_tools_replace: (...args: RequestArguments<'post_players_id_profession_tools_replace'>) => {
      return client.request('post_players_id_profession_tools_replace', ...args);
    }
  };
}
