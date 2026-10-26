// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { CommunityOperations } from './types.js';
export { communityOperationDefinitions } from './operations.js';

export function createCommunityApi(client: APIClient) {
  return {
    post_players_id_glossary_edit_context: (...args: RequestArguments<'post_players_id_glossary_edit_context'>) => client.request('post_players_id_glossary_edit_context', ...args),
    get_glossary_view: (...args: RequestArguments<'get_glossary_view'>) => client.request('get_glossary_view', ...args),
    get_glossary_edit_quota: (...args: RequestArguments<'get_glossary_edit_quota'>) => client.request('get_glossary_edit_quota', ...args),
    get_glossary_edit_permission: (...args: RequestArguments<'get_glossary_edit_permission'>) => client.request('get_glossary_edit_permission', ...args),
    get_players_id_catalog_item_detail: (...args: RequestArguments<'get_players_id_catalog_item_detail'>) => client.request('get_players_id_catalog_item_detail', ...args),
    get_glossary_entry: (...args: RequestArguments<'get_glossary_entry'>) => client.request('get_glossary_entry', ...args),
    get_feedback_feedbackId: (...args: RequestArguments<'get_feedback_feedbackId'>) => {
      return client.request('get_feedback_feedbackId', ...args);
    },
    get_players_id_notices: (...args: RequestArguments<'get_players_id_notices'>) => {
      return client.request('get_players_id_notices', ...args);
    },
    post_players_id_notices_noticeId_read: (...args: RequestArguments<'post_players_id_notices_noticeId_read'>) => {
      return client.request('post_players_id_notices_noticeId_read', ...args);
    },
    get_encyclopedia_categories: (...args: RequestArguments<'get_encyclopedia_categories'>) => {
      return client.request('get_encyclopedia_categories', ...args);
    },
    get_encyclopedia: (...args: RequestArguments<'get_encyclopedia'>) => {
      return client.request('get_encyclopedia', ...args);
    },
    get_encyclopedia_category_entryId: (...args: RequestArguments<'get_encyclopedia_category_entryId'>) => {
      return client.request('get_encyclopedia_category_entryId', ...args);
    },
    get_content_tianshu: (...args: RequestArguments<'get_content_tianshu'>) => {
      return client.request('get_content_tianshu', ...args);
    },
    get_players_id_memories: (...args: RequestArguments<'get_players_id_memories'>) => {
      return client.request('get_players_id_memories', ...args);
    },
    get_players_id_story: (...args: RequestArguments<'get_players_id_story'>) => {
      return client.request('get_players_id_story', ...args);
    },
    get_notices: (...args: RequestArguments<'get_notices'>) => {
      return client.request('get_notices', ...args);
    },
    get_notices_noticeId: (...args: RequestArguments<'get_notices_noticeId'>) => {
      return client.request('get_notices_noticeId', ...args);
    },
    get_feedback_categories: (...args: RequestArguments<'get_feedback_categories'>) => {
      return client.request('get_feedback_categories', ...args);
    },
    get_feedback_mine: (...args: RequestArguments<'get_feedback_mine'>) => {
      return client.request('get_feedback_mine', ...args);
    },
    post_feedback: (...args: RequestArguments<'post_feedback'>) => {
      return client.request('post_feedback', ...args);
    },
    get_glossary: (...args: RequestArguments<'get_glossary'>) => {
      return client.request('get_glossary', ...args);
    },
    get_glossary_categories: (...args: RequestArguments<'get_glossary_categories'>) => {
      return client.request('get_glossary_categories', ...args);
    },
    get_glossary_policy: (...args: RequestArguments<'get_glossary_policy'>) => client.request('get_glossary_policy', ...args),
    get_glossary_edit_applications_mine: (...args: RequestArguments<'get_glossary_edit_applications_mine'>) => {
      return client.request('get_glossary_edit_applications_mine', ...args);
    },
    post_glossary_edit_applications: (...args: RequestArguments<'post_glossary_edit_applications'>) => {
      return client.request('post_glossary_edit_applications', ...args);
    },
    put_glossary_keyword: (...args: RequestArguments<'put_glossary_keyword'>) => {
      return client.request('put_glossary_keyword', ...args);
    },
    delete_glossary_keyword: (...args: RequestArguments<'delete_glossary_keyword'>) => {
      return client.request('delete_glossary_keyword', ...args);
    },
    get_tianshi_baolu: (...args: RequestArguments<'get_tianshi_baolu'>) => {
      return client.request('get_tianshi_baolu', ...args);
    }
  };
}
