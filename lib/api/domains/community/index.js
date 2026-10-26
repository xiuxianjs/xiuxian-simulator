import { communityOperationDefinitions } from "./operations.js";

//#region src/api/domains/community/index.ts
function createCommunityApi(client) {
	return {
		post_players_id_glossary_edit_context: (...args) => client.request("post_players_id_glossary_edit_context", ...args),
		get_glossary_view: (...args) => client.request("get_glossary_view", ...args),
		get_glossary_edit_quota: (...args) => client.request("get_glossary_edit_quota", ...args),
		get_glossary_edit_permission: (...args) => client.request("get_glossary_edit_permission", ...args),
		get_players_id_catalog_item_detail: (...args) => client.request("get_players_id_catalog_item_detail", ...args),
		get_glossary_entry: (...args) => client.request("get_glossary_entry", ...args),
		get_feedback_feedbackId: (...args) => {
			return client.request("get_feedback_feedbackId", ...args);
		},
		get_players_id_notices: (...args) => {
			return client.request("get_players_id_notices", ...args);
		},
		post_players_id_notices_noticeId_read: (...args) => {
			return client.request("post_players_id_notices_noticeId_read", ...args);
		},
		get_encyclopedia_categories: (...args) => {
			return client.request("get_encyclopedia_categories", ...args);
		},
		get_encyclopedia: (...args) => {
			return client.request("get_encyclopedia", ...args);
		},
		get_encyclopedia_category_entryId: (...args) => {
			return client.request("get_encyclopedia_category_entryId", ...args);
		},
		get_content_tianshu: (...args) => {
			return client.request("get_content_tianshu", ...args);
		},
		get_players_id_memories: (...args) => {
			return client.request("get_players_id_memories", ...args);
		},
		get_players_id_story: (...args) => {
			return client.request("get_players_id_story", ...args);
		},
		get_notices: (...args) => {
			return client.request("get_notices", ...args);
		},
		get_notices_noticeId: (...args) => {
			return client.request("get_notices_noticeId", ...args);
		},
		get_feedback_categories: (...args) => {
			return client.request("get_feedback_categories", ...args);
		},
		get_feedback_mine: (...args) => {
			return client.request("get_feedback_mine", ...args);
		},
		post_feedback: (...args) => {
			return client.request("post_feedback", ...args);
		},
		get_glossary: (...args) => {
			return client.request("get_glossary", ...args);
		},
		get_glossary_categories: (...args) => {
			return client.request("get_glossary_categories", ...args);
		},
		get_glossary_policy: (...args) => client.request("get_glossary_policy", ...args),
		get_glossary_edit_applications_mine: (...args) => {
			return client.request("get_glossary_edit_applications_mine", ...args);
		},
		post_glossary_edit_applications: (...args) => {
			return client.request("post_glossary_edit_applications", ...args);
		},
		put_glossary_keyword: (...args) => {
			return client.request("put_glossary_keyword", ...args);
		},
		delete_glossary_keyword: (...args) => {
			return client.request("delete_glossary_keyword", ...args);
		},
		get_tianshi_baolu: (...args) => {
			return client.request("get_tianshi_baolu", ...args);
		}
	};
}

//#endregion
export { communityOperationDefinitions, createCommunityApi };