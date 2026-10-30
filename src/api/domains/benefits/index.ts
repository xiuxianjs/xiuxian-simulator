// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { BenefitsOperations } from './types.js';
export { benefitsOperationDefinitions } from './operations.js';

export function createBenefitsApi(client: APIClient) {
  return {
    get_players_id_activities_newcomer_login: (...args: RequestArguments<'get_players_id_activities_newcomer_login'>) => client.request('get_players_id_activities_newcomer_login', ...args),
    get_players_id_recharge_catalog: (...args: RequestArguments<'get_players_id_recharge_catalog'>) => client.request('get_players_id_recharge_catalog', ...args),
    get_players_id_recharge_normal_packages: (...args: RequestArguments<'get_players_id_recharge_normal_packages'>) => {
      return client.request('get_players_id_recharge_normal_packages', ...args);
    },
    get_players_id_limited_events_tokens: (...args: RequestArguments<'get_players_id_limited_events_tokens'>) => client.request('get_players_id_limited_events_tokens', ...args),
    get_players_id_vip_privileges: (...args: RequestArguments<'get_players_id_vip_privileges'>) => client.request('get_players_id_vip_privileges', ...args),
    get_players_id_limited_events_recharge_tiers: (...args: RequestArguments<'get_players_id_limited_events_recharge_tiers'>) => {
      return client.request('get_players_id_limited_events_recharge_tiers', ...args);
    },
    post_players_id_limited_events_recharge_tiers_subActivityId_claim: (
      ...args: RequestArguments<'post_players_id_limited_events_recharge_tiers_subActivityId_claim'>
    ) => {
      return client.request('post_players_id_limited_events_recharge_tiers_subActivityId_claim', ...args);
    },
    get_players_id_limited_events_recharge_packages: (...args: RequestArguments<'get_players_id_limited_events_recharge_packages'>) => {
      return client.request('get_players_id_limited_events_recharge_packages', ...args);
    },
    get_players_id_recharge_overview: (...args: RequestArguments<'get_players_id_recharge_overview'>) => {
      return client.request('get_players_id_recharge_overview', ...args);
    },
    get_players_id_recharge_first: (...args: RequestArguments<'get_players_id_recharge_first'>) => {
      return client.request('get_players_id_recharge_first', ...args);
    },
    post_players_id_recharge_first_tiers_tierAmount_claim: (...args: RequestArguments<'post_players_id_recharge_first_tiers_tierAmount_claim'>) => {
      return client.request('post_players_id_recharge_first_tiers_tierAmount_claim', ...args);
    },
    get_players_id_recharge_weekly_rebate: (...args: RequestArguments<'get_players_id_recharge_weekly_rebate'>) => {
      return client.request('get_players_id_recharge_weekly_rebate', ...args);
    },
    post_players_id_recharge_weekly_rebate_dayIndex_claim: (...args: RequestArguments<'post_players_id_recharge_weekly_rebate_dayIndex_claim'>) => {
      return client.request('post_players_id_recharge_weekly_rebate_dayIndex_claim', ...args);
    },
    post_players_id_recharge_weekly_rebate_loop_claim: (...args: RequestArguments<'post_players_id_recharge_weekly_rebate_loop_claim'>) => {
      return client.request('post_players_id_recharge_weekly_rebate_loop_claim', ...args);
    },
    post_players_id_recharge_newcomer_claim: (...args: RequestArguments<'post_players_id_recharge_newcomer_claim'>) => {
      return client.request('post_players_id_recharge_newcomer_claim', ...args);
    },
    get_players_id_recharge_newcomer: (...args: RequestArguments<'get_players_id_recharge_newcomer'>) => {
      return client.request('get_players_id_recharge_newcomer', ...args);
    },
    get_players_id_recharge_vip: (...args: RequestArguments<'get_players_id_recharge_vip'>) => {
      return client.request('get_players_id_recharge_vip', ...args);
    },
    get_players_id_recharge_double: (...args: RequestArguments<'get_players_id_recharge_double'>) => {
      return client.request('get_players_id_recharge_double', ...args);
    },
    get_players_id_recharge_month_card: (...args: RequestArguments<'get_players_id_recharge_month_card'>) => {
      return client.request('get_players_id_recharge_month_card', ...args);
    },
    get_players_id_recharge_month_card_daily_rewards: (...args: RequestArguments<'get_players_id_recharge_month_card_daily_rewards'>) => {
      return client.request('get_players_id_recharge_month_card_daily_rewards', ...args);
    },
    post_players_id_recharge_month_card_daily_rewards_claim_all: (...args: RequestArguments<'post_players_id_recharge_month_card_daily_rewards_claim_all'>) => {
      return client.request('post_players_id_recharge_month_card_daily_rewards_claim_all', ...args);
    },
    get_players_id_recharge_world_milestones: (...args: RequestArguments<'get_players_id_recharge_world_milestones'>) => {
      return client.request('get_players_id_recharge_world_milestones', ...args);
    },
    post_players_id_recharge_world_milestones_order_claim: (...args: RequestArguments<'post_players_id_recharge_world_milestones_order_claim'>) => {
      return client.request('post_players_id_recharge_world_milestones_order_claim', ...args);
    },
    post_players_id_recharge_world_milestones_claim_all: (...args: RequestArguments<'post_players_id_recharge_world_milestones_claim_all'>) => {
      return client.request('post_players_id_recharge_world_milestones_claim_all', ...args);
    }
  };
}
