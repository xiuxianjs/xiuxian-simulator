// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { RewardsOperations } from './types.js';
export { rewardsOperationDefinitions } from './operations.js';

export function createRewardsApi(client: APIClient) {
  return {
    get_bounties: (...args: RequestArguments<'get_bounties'>) => {
      return client.request('get_bounties', ...args);
    },
    get_bounties_publish_policy: (...args: RequestArguments<'get_bounties_publish_policy'>) => {
      return client.request('get_bounties_publish_policy', ...args);
    },
    get_players_id_bounties_pending_rewards: (...args: RequestArguments<'get_players_id_bounties_pending_rewards'>) => {
      return client.request('get_players_id_bounties_pending_rewards', ...args);
    },
    post_players_id_bounties: (...args: RequestArguments<'post_players_id_bounties'>) => {
      return client.request('post_players_id_bounties', ...args);
    },
    post_bounties_bountyId_accept: (...args: RequestArguments<'post_bounties_bountyId_accept'>) => {
      return client.request('post_bounties_bountyId_accept', ...args);
    },
    post_bounties_bountyId_challenge: (...args: RequestArguments<'post_bounties_bountyId_challenge'>) => {
      return client.request('post_bounties_bountyId_challenge', ...args);
    },
    post_bounties_bountyId_claim: (...args: RequestArguments<'post_bounties_bountyId_claim'>) => {
      return client.request('post_bounties_bountyId_claim', ...args);
    },
    post_players_id_check_ins_daily: (...args: RequestArguments<'post_players_id_check_ins_daily'>) => {
      return client.request('post_players_id_check_ins_daily', ...args);
    },
    post_players_id_check_ins_celestial: (...args: RequestArguments<'post_players_id_check_ins_celestial'>) => {
      return client.request('post_players_id_check_ins_celestial', ...args);
    },
    post_players_id_check_ins_newcomer: (...args: RequestArguments<'post_players_id_check_ins_newcomer'>) => {
      return client.request('post_players_id_check_ins_newcomer', ...args);
    },
    get_players_id_check_ins_ritual_scope: (...args: RequestArguments<'get_players_id_check_ins_ritual_scope'>) => {
      return client.request('get_players_id_check_ins_ritual_scope', ...args);
    },
    get_players_id_emails: (...args: RequestArguments<'get_players_id_emails'>) => {
      return client.request('get_players_id_emails', ...args);
    },
    delete_players_id_emails: (...args: RequestArguments<'delete_players_id_emails'>) => {
      return client.request('delete_players_id_emails', ...args);
    },
    post_players_id_emails_emailId_claim: (...args: RequestArguments<'post_players_id_emails_emailId_claim'>) => {
      return client.request('post_players_id_emails_emailId_claim', ...args);
    },
    get_players_id_emails_unread_count: (...args: RequestArguments<'get_players_id_emails_unread_count'>) => {
      return client.request('get_players_id_emails_unread_count', ...args);
    },
    post_players_id_emails_claim_all: (...args: RequestArguments<'post_players_id_emails_claim_all'>) => {
      return client.request('post_players_id_emails_claim_all', ...args);
    },
    get_achievements: (...args: RequestArguments<'get_achievements'>) => {
      return client.request('get_achievements', ...args);
    },
    get_players_id_achievements: (...args: RequestArguments<'get_players_id_achievements'>) => {
      return client.request('get_players_id_achievements', ...args);
    },
    get_players_id_achievements_overview: (...args: RequestArguments<'get_players_id_achievements_overview'>) => {
      return client.request('get_players_id_achievements_overview', ...args);
    },
    get_players_id_achievements_category_projection: (...args: RequestArguments<'get_players_id_achievements_category_projection'>) => {
      return client.request('get_players_id_achievements_category_projection', ...args);
    },
    get_players_id_achievements_categories_category: (...args: RequestArguments<'get_players_id_achievements_categories_category'>) => {
      return client.request('get_players_id_achievements_categories_category', ...args);
    },
    post_players_id_achievements_claim: (...args: RequestArguments<'post_players_id_achievements_claim'>) => {
      return client.request('post_players_id_achievements_claim', ...args);
    },
    get_players_id_themes: (...args: RequestArguments<'get_players_id_themes'>) => {
      return client.request('get_players_id_themes', ...args);
    },
    get_players_id_themes_permission: (...args: RequestArguments<'get_players_id_themes_permission'>) => {
      return client.request('get_players_id_themes_permission', ...args);
    },
    post_players_id_themes_themeId_activate: (...args: RequestArguments<'post_players_id_themes_themeId_activate'>) => {
      return client.request('post_players_id_themes_themeId_activate', ...args);
    },
    post_players_id_themes_deactivate: (...args: RequestArguments<'post_players_id_themes_deactivate'>) => {
      return client.request('post_players_id_themes_deactivate', ...args);
    },
    post_players_id_themes_custom: (...args: RequestArguments<'post_players_id_themes_custom'>) => {
      return client.request('post_players_id_themes_custom', ...args);
    },
    get_players_id_emails_emailId: (...args: RequestArguments<'get_players_id_emails_emailId'>) => {
      return client.request('get_players_id_emails_emailId', ...args);
    },
    delete_players_id_emails_emailId: (...args: RequestArguments<'delete_players_id_emails_emailId'>) => {
      return client.request('delete_players_id_emails_emailId', ...args);
    },
    post_players_id_emails_emailId_delete_attempt: (...args: RequestArguments<'post_players_id_emails_emailId_delete_attempt'>) => {
      return client.request('post_players_id_emails_emailId_delete_attempt', ...args);
    },
    post_players_id_gift_codes_redeem: (...args: RequestArguments<'post_players_id_gift_codes_redeem'>) => {
      return client.request('post_players_id_gift_codes_redeem', ...args);
    },
    post_players_id_external_gift_codes_redeem: (...args: RequestArguments<'post_players_id_external_gift_codes_redeem'>) => {
      return client.request('post_players_id_external_gift_codes_redeem', ...args);
    },
    get_players_id_referral: (...args: RequestArguments<'get_players_id_referral'>) => {
      return client.request('get_players_id_referral', ...args);
    },
    post_players_id_referral_sync: (...args: RequestArguments<'post_players_id_referral_sync'>) => {
      return client.request('post_players_id_referral_sync', ...args);
    },
    post_players_id_referral_bind: (...args: RequestArguments<'post_players_id_referral_bind'>) => {
      return client.request('post_players_id_referral_bind', ...args);
    },
    post_players_id_referral_claim: (...args: RequestArguments<'post_players_id_referral_claim'>) => {
      return client.request('post_players_id_referral_claim', ...args);
    },
    get_players_id_activities_rewardType: (...args: RequestArguments<'get_players_id_activities_rewardType'>) => {
      return client.request('get_players_id_activities_rewardType', ...args);
    },
    post_players_id_activities_rewardType_claim: (...args: RequestArguments<'post_players_id_activities_rewardType_claim'>) => {
      return client.request('post_players_id_activities_rewardType_claim', ...args);
    },
    post_players_id_activities_rewardType_claim_all: (...args: RequestArguments<'post_players_id_activities_rewardType_claim_all'>) => {
      return client.request('post_players_id_activities_rewardType_claim_all', ...args);
    },
    get_players_id_limited_events: (...args: RequestArguments<'get_players_id_limited_events'>) => {
      return client.request('get_players_id_limited_events', ...args);
    },
    get_players_id_limited_events_check_ins: (...args: RequestArguments<'get_players_id_limited_events_check_ins'>) => {
      return client.request('get_players_id_limited_events_check_ins', ...args);
    },
    post_players_id_limited_events_check_in: (...args: RequestArguments<'post_players_id_limited_events_check_in'>) => {
      return client.request('post_players_id_limited_events_check_in', ...args);
    },
    get_players_id_limited_events_tasks: (...args: RequestArguments<'get_players_id_limited_events_tasks'>) => {
      return client.request('get_players_id_limited_events_tasks', ...args);
    },
    post_players_id_limited_events_tasks_taskId_claim: (...args: RequestArguments<'post_players_id_limited_events_tasks_taskId_claim'>) => {
      return client.request('post_players_id_limited_events_tasks_taskId_claim', ...args);
    },
    post_players_id_themes_ink_mode: (...args: RequestArguments<'post_players_id_themes_ink_mode'>) => {
      return client.request('post_players_id_themes_ink_mode', ...args);
    },
    delete_players_id_themes_custom_themeId: (...args: RequestArguments<'delete_players_id_themes_custom_themeId'>) => {
      return client.request('delete_players_id_themes_custom_themeId', ...args);
    }
  };
}
