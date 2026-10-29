// HTTP contract aligned with Go docs/openapi.yaml. Verify with test/query-registration-contract.test.ts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { CultivationOperations } from './types.js';
export { cultivationOperationDefinitions } from './operations.js';

export function createCultivationApi(client: APIClient) {
  return {
    post_players_id_seclusion_command: (...args: RequestArguments<'post_players_id_seclusion_command'>) => client.request('post_players_id_seclusion_command', ...args),
    post_players_id_tribulation_events_eventId_confirmation_query: (
      ...args: RequestArguments<'post_players_id_tribulation_events_eventId_confirmation_query'>
    ) => client.request('post_players_id_tribulation_events_eventId_confirmation_query', ...args),
    post_players_id_realm_promotion_command: (...args: RequestArguments<'post_players_id_realm_promotion_command'>) => client.request('post_players_id_realm_promotion_command', ...args),
    get_tribulation_events: (...args: RequestArguments<'get_tribulation_events'>) => client.request('get_tribulation_events', ...args),
    get_tribulation_events_eventId: (...args: RequestArguments<'get_tribulation_events_eventId'>) => client.request('get_tribulation_events_eventId', ...args),
    post_players_id_tribulation_events_eventId_confirmation: (...args: RequestArguments<'post_players_id_tribulation_events_eventId_confirmation'>) => client.request('post_players_id_tribulation_events_eventId_confirmation', ...args),
    post_players_id_tribulation_events_eventId_open: (...args: RequestArguments<'post_players_id_tribulation_events_eventId_open'>) => client.request('post_players_id_tribulation_events_eventId_open', ...args),
    post_players_id_tribulation_events_eventId_start: (...args: RequestArguments<'post_players_id_tribulation_events_eventId_start'>) => client.request('post_players_id_tribulation_events_eventId_start', ...args),
    get_players_id_tribulation_events_eventId_result: (...args: RequestArguments<'get_players_id_tribulation_events_eventId_result'>) => client.request('get_players_id_tribulation_events_eventId_result', ...args),
    post_players_id_entry: (...args: RequestArguments<'post_players_id_entry'>) => {
      return client.request('post_players_id_entry', ...args);
    },
    post_players_id_resources_settle: (...args: RequestArguments<'post_players_id_resources_settle'>) => {
      return client.request('post_players_id_resources_settle', ...args);
    },
    get_players_id_mental: (...args: RequestArguments<'get_players_id_mental'>) => {
      return client.request('get_players_id_mental', ...args);
    },
    get_players_id_meditation_active: (...args: RequestArguments<'get_players_id_meditation_active'>) => {
      return client.request('get_players_id_meditation_active', ...args);
    },
    get_players_id_meditation_progress: (...args: RequestArguments<'get_players_id_meditation_progress'>) => client.request('get_players_id_meditation_progress', ...args),
    post_players_id_meditation_guard: (...args: RequestArguments<'post_players_id_meditation_guard'>) => {
      return client.request('post_players_id_meditation_guard', ...args);
    },
    post_players_id_meditation_start: (...args: RequestArguments<'post_players_id_meditation_start'>) => {
      return client.request('post_players_id_meditation_start', ...args);
    },
    post_players_id_meditation_settle: (...args: RequestArguments<'post_players_id_meditation_settle'>) => {
      return client.request('post_players_id_meditation_settle', ...args);
    },
    get_players_id_realm_breakthrough: (...args: RequestArguments<'get_players_id_realm_breakthrough'>) => {
      return client.request('get_players_id_realm_breakthrough', ...args);
    },
    post_players_id_realm_breakthrough: (...args: RequestArguments<'post_players_id_realm_breakthrough'>) => {
      return client.request('post_players_id_realm_breakthrough', ...args);
    },
    get_players_id_realm_promotion: (...args: RequestArguments<'get_players_id_realm_promotion'>) => {
      return client.request('get_players_id_realm_promotion', ...args);
    },
    post_players_id_realm_promotion: (...args: RequestArguments<'post_players_id_realm_promotion'>) => {
      return client.request('post_players_id_realm_promotion', ...args);
    },
    get_players_id_realm_tribulation_preview: (...args: RequestArguments<'get_players_id_realm_tribulation_preview'>) => {
      return client.request('get_players_id_realm_tribulation_preview', ...args);
    },
    get_players_id_meridians: (...args: RequestArguments<'get_players_id_meridians'>) => {
      return client.request('get_players_id_meridians', ...args);
    },
    post_players_id_meridians_pulse: (...args: RequestArguments<'post_players_id_meridians_pulse'>) => {
      return client.request('post_players_id_meridians_pulse', ...args);
    },
    get_players_id_seclusion: (...args: RequestArguments<'get_players_id_seclusion'>) => {
      return client.request('get_players_id_seclusion', ...args);
    },
    post_players_id_seclusion_guard: (...args: RequestArguments<'post_players_id_seclusion_guard'>) => {
      return client.request('post_players_id_seclusion_guard', ...args);
    },
    get_players_id_seclusion_selection: (...args: RequestArguments<'get_players_id_seclusion_selection'>) => {
      return client.request('get_players_id_seclusion_selection', ...args);
    },
    get_players_id_seclusion_preview: (...args: RequestArguments<'get_players_id_seclusion_preview'>) => {
      return client.request('get_players_id_seclusion_preview', ...args);
    },
    post_players_id_seclusion_start: (...args: RequestArguments<'post_players_id_seclusion_start'>) => {
      return client.request('post_players_id_seclusion_start', ...args);
    },
    post_players_id_seclusion_start_by_name: (...args: RequestArguments<'post_players_id_seclusion_start_by_name'>) => {
      return client.request('post_players_id_seclusion_start_by_name', ...args);
    },
    post_players_id_seclusion_end: (...args: RequestArguments<'post_players_id_seclusion_end'>) => {
      return client.request('post_players_id_seclusion_end', ...args);
    },
    get_players_id_soul_path: (...args: RequestArguments<'get_players_id_soul_path'>) => {
      return client.request('get_players_id_soul_path', ...args);
    },
    post_players_id_soul_path_choose: (...args: RequestArguments<'post_players_id_soul_path_choose'>) => {
      return client.request('post_players_id_soul_path_choose', ...args);
    },
    post_players_id_soul_path_switch: (...args: RequestArguments<'post_players_id_soul_path_switch'>) => {
      return client.request('post_players_id_soul_path_switch', ...args);
    },
    post_players_id_soul_path_advance: (...args: RequestArguments<'post_players_id_soul_path_advance'>) => {
      return client.request('post_players_id_soul_path_advance', ...args);
    },
    post_players_id_soul_path_nurture: (...args: RequestArguments<'post_players_id_soul_path_nurture'>) => {
      return client.request('post_players_id_soul_path_nurture', ...args);
    },
    post_players_id_soul_path_reroll: (...args: RequestArguments<'post_players_id_soul_path_reroll'>) => {
      return client.request('post_players_id_soul_path_reroll', ...args);
    },
    put_players_id_soul_path_supply_direction: (...args: RequestArguments<'put_players_id_soul_path_supply_direction'>) => {
      return client.request('put_players_id_soul_path_supply_direction', ...args);
    },

    post_players_id_green_bottle_convert: (...args: RequestArguments<'post_players_id_green_bottle_convert'>) => {
      return client.request('post_players_id_green_bottle_convert', ...args);
    },
    post_players_id_peiyuan_dan_use: (...args: RequestArguments<'post_players_id_peiyuan_dan_use'>) => {
      return client.request('post_players_id_peiyuan_dan_use', ...args);
    },
    post_players_id_peiyuan_dan_confirm: (...args: RequestArguments<'post_players_id_peiyuan_dan_confirm'>) => {
      return client.request('post_players_id_peiyuan_dan_confirm', ...args);
    },
    post_players_id_peiyuan_dan_cancel: (...args: RequestArguments<'post_players_id_peiyuan_dan_cancel'>) => {
      return client.request('post_players_id_peiyuan_dan_cancel', ...args);
    },
    get_players_id_green_bottle: (...args: RequestArguments<'get_players_id_green_bottle'>) => {
      return client.request('get_players_id_green_bottle', ...args);
    }
  };
}
