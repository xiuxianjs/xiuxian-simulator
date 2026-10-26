// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { PlayersOperations } from './types.js';
export { playersOperationDefinitions } from './operations.js';

export function createPlayersApi(client: APIClient) {
  return {
    post_players_id_query_presentations: (...args: RequestArguments<'post_players_id_query_presentations'>) => client.request('post_players_id_query_presentations', ...args),
    post_players_id_companion_gifts_command: (...args: RequestArguments<'post_players_id_companion_gifts_command'>) => client.request('post_players_id_companion_gifts_command', ...args),
    post_players_id_companion_proposals_command: (...args: RequestArguments<'post_players_id_companion_proposals_command'>) => client.request('post_players_id_companion_proposals_command', ...args),
    post_players_id_tianshi_baolu_panel_query: (...args: RequestArguments<'post_players_id_tianshi_baolu_panel_query'>) => client.request('post_players_id_tianshi_baolu_panel_query', ...args),
    post_players_id_companion_shop_purchases_overview: (...args: RequestArguments<'post_players_id_companion_shop_purchases_overview'>) => client.request('post_players_id_companion_shop_purchases_overview', ...args),
    post_players_id_shop_purchases_overview: (...args: RequestArguments<'post_players_id_shop_purchases_overview'>) => client.request('post_players_id_shop_purchases_overview', ...args),
    post_players_id_gacha_named_poolName_pull: (...args: RequestArguments<'post_players_id_gacha_named_poolName_pull'>) => client.request('post_players_id_gacha_named_poolName_pull', ...args),
    get_players_id_gacha_named_poolName_view: (...args: RequestArguments<'get_players_id_gacha_named_poolName_view'>) => client.request('get_players_id_gacha_named_poolName_view', ...args),
    post_players_id_market_shop_overview_ensure: (...args: RequestArguments<'post_players_id_market_shop_overview_ensure'>) => client.request('post_players_id_market_shop_overview_ensure', ...args),
    post_players_id_companion_proposals_overview: (...args: RequestArguments<'post_players_id_companion_proposals_overview'>) => client.request('post_players_id_companion_proposals_overview', ...args),
    post_players_id_companion_confirmation_action: (...args: RequestArguments<'post_players_id_companion_confirmation_action'>) => client.request('post_players_id_companion_confirmation_action', ...args),
    post_players_id_companion_proposals_by_name_action: (...args: RequestArguments<'post_players_id_companion_proposals_by_name_action'>) => client.request('post_players_id_companion_proposals_by_name_action', ...args),
    post_players_id_recharge_first_tiers_tierAmount_claim_overview: (
      ...args: RequestArguments<'post_players_id_recharge_first_tiers_tierAmount_claim_overview'>
    ) => client.request('post_players_id_recharge_first_tiers_tierAmount_claim_overview', ...args),
    post_players_id_recharge_month_card_daily_rewards_claim_overview: (
      ...args: RequestArguments<'post_players_id_recharge_month_card_daily_rewards_claim_overview'>
    ) => client.request('post_players_id_recharge_month_card_daily_rewards_claim_overview', ...args),
    post_players_id_check_ins_scope_with_ritual: (...args: RequestArguments<'post_players_id_check_ins_scope_with_ritual'>) => client.request('post_players_id_check_ins_scope_with_ritual', ...args),
    post_players_id_referral_overview_sync: (...args: RequestArguments<'post_players_id_referral_overview_sync'>) => client.request('post_players_id_referral_overview_sync', ...args),
    get_players_id_settings_overview: (...args: RequestArguments<'get_players_id_settings_overview'>) => client.request('get_players_id_settings_overview', ...args),
    post_players_id_home_overview: (...args: RequestArguments<'post_players_id_home_overview'>) => client.request('post_players_id_home_overview', ...args),
    get_players_id_activity_hub: (...args: RequestArguments<'get_players_id_activity_hub'>) => {
      return client.request('get_players_id_activity_hub', ...args);
    },
    post_players_id_captcha_state_challenge: (...args: RequestArguments<'post_players_id_captcha_state_challenge'>) => {
      return client.request('post_players_id_captcha_state_challenge', ...args);
    },
    put_players_id_signature: (...args: RequestArguments<'put_players_id_signature'>) => client.request('put_players_id_signature', ...args),
    patch_players_id_preferences_dao_crystal_confirmation: (...args: RequestArguments<'patch_players_id_preferences_dao_crystal_confirmation'>) => {
      return client.request('patch_players_id_preferences_dao_crystal_confirmation', ...args);
    },
    patch_players_id_preferences_spirit_crystal_confirmation: (...args: RequestArguments<'patch_players_id_preferences_spirit_crystal_confirmation'>) => {
      return client.request('patch_players_id_preferences_spirit_crystal_confirmation', ...args);
    },
    get_players_id_preferences: (...args: RequestArguments<'get_players_id_preferences'>) => {
      return client.request('get_players_id_preferences', ...args);
    },
    post_players_id_client_state_repeat_record: (...args: RequestArguments<'post_players_id_client_state_repeat_record'>) => {
      return client.request('post_players_id_client_state_repeat_record', ...args);
    },
    patch_players_id_preferences_team_auto_accept_invite: (...args: RequestArguments<'patch_players_id_preferences_team_auto_accept_invite'>) => {
      return client.request('patch_players_id_preferences_team_auto_accept_invite', ...args);
    },
    patch_players_id_preferences_dungeon_battle_mode: (...args: RequestArguments<'patch_players_id_preferences_dungeon_battle_mode'>) => {
      return client.request('patch_players_id_preferences_dungeon_battle_mode', ...args);
    },
    patch_players_id_preferences_team_dungeon_energy: (...args: RequestArguments<'patch_players_id_preferences_team_dungeon_energy'>) => {
      return client.request('patch_players_id_preferences_team_dungeon_energy', ...args);
    },
    patch_players_id_preferences_team_invites: (...args: RequestArguments<'patch_players_id_preferences_team_invites'>) => {
      return client.request('patch_players_id_preferences_team_invites', ...args);
    },
    patch_players_id_preferences_friend_team_approval: (...args: RequestArguments<'patch_players_id_preferences_friend_team_approval'>) => {
      return client.request('patch_players_id_preferences_friend_team_approval', ...args);
    },
    patch_players_id_preferences_profile_visibility: (...args: RequestArguments<'patch_players_id_preferences_profile_visibility'>) => {
      return client.request('patch_players_id_preferences_profile_visibility', ...args);
    },
    get_robot_realm_access: (...args: RequestArguments<'get_robot_realm_access'>) => client.request('get_robot_realm_access', ...args),
    get_players_id_home_overview: (...args: RequestArguments<'get_players_id_home_overview'>) => client.request('get_players_id_home_overview', ...args),
    get_players_id_home_notifications: (...args: RequestArguments<'get_players_id_home_notifications'>) => {
      return client.request('get_players_id_home_notifications', ...args);
    },
    post_players_id_home_atmosphere_claim: (...args: RequestArguments<'post_players_id_home_atmosphere_claim'>) => {
      return client.request('post_players_id_home_atmosphere_claim', ...args);
    },
    get_players_id_feature_access: (...args: RequestArguments<'get_players_id_feature_access'>) => client.request('get_players_id_feature_access', ...args),
    get_players_id_check_ins_status: (...args: RequestArguments<'get_players_id_check_ins_status'>) => client.request('get_players_id_check_ins_status', ...args),
    get_me: (...args: RequestArguments<'get_me'>) => {
      return client.request('get_me', ...args);
    },
    post_players: (...args: RequestArguments<'post_players'>) => {
      return client.request('post_players', ...args);
    },
    get_players_id: (...args: RequestArguments<'get_players_id'>) => {
      return client.request('get_players_id', ...args);
    },
    get_players_by_bid_bid: (...args: RequestArguments<'get_players_by_bid_bid'>) => {
      return client.request('get_players_by_bid_bid', ...args);
    },
    get_players_id_battle_attributes: (...args: RequestArguments<'get_players_id_battle_attributes'>) => {
      return client.request('get_players_id_battle_attributes', ...args);
    },
    get_players_id_attribute_panel: (...args: RequestArguments<'get_players_id_attribute_panel'>) => {
      return client.request('get_players_id_attribute_panel', ...args);
    }
  };
}
