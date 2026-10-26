//#region src/api/domains/community/operations.ts
const communityOperationDefinitions = {
	post_players_id_glossary_edit_context: {
		method: "POST",
		path: "/api/v1/players/{id}/glossary/edit-context",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			name: "id",
			required: true,
			style: "simple",
			explode: false,
			schema: {
				type: "integer",
				minimum: 1
			}
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Repeat-Command",
			required: false,
			style: "simple",
			explode: false,
			schema: { type: "string" }
		}]
	},
	get_glossary_view: {
		method: "GET",
		path: "/api/v1/glossary/view",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [
			{
				schema: {
					type: "string",
					enum: [
						"browse",
						"search",
						"category",
						"edit_context"
					]
				},
				name: "action",
				required: true,
				style: "form",
				explode: true
			},
			{
				schema: {
					type: "integer",
					minimum: 1
				},
				name: "page",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "keyword",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "category",
				required: false,
				style: "form",
				explode: true
			}
		],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_glossary_edit_quota: {
		method: "GET",
		path: "/api/v1/glossary/edit-quota",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [],
		headerParams: []
	},
	get_glossary_edit_permission: {
		method: "GET",
		path: "/api/v1/glossary/edit-permission",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [],
		headerParams: []
	},
	get_players_id_catalog_item_detail: {
		method: "GET",
		path: "/api/v1/players/{id}/catalog/item-detail",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [
			{
				schema: {
					type: "string",
					enum: [
						"item",
						"equipment",
						"profession_tool",
						"skill_book"
					]
				},
				name: "category",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: {
					type: "integer",
					minimum: 0
				},
				name: "entryId",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "name",
				required: false,
				style: "form",
				explode: true
			}
		],
		headerParams: []
	},
	get_glossary_entry: {
		method: "GET",
		path: "/api/v1/glossary/entry",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [{
			schema: { type: "string" },
			name: "keyword",
			required: true,
			style: "form",
			explode: true
		}],
		headerParams: []
	},
	get_feedback_feedbackId: {
		method: "GET",
		path: "/api/v1/feedback/{feedbackId}",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "feedbackId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: []
	},
	get_players_id_notices: {
		method: "GET",
		path: "/api/v1/players/{id}/notices",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [{
			schema: { type: "integer" },
			name: "page",
			required: false,
			style: "form",
			explode: true
		}, {
			schema: { type: "integer" },
			name: "pageSize",
			required: false,
			style: "form",
			explode: true
		}],
		headerParams: []
	},
	post_players_id_notices_noticeId_read: {
		method: "POST",
		path: "/api/v1/players/{id}/notices/{noticeId}/read",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}, {
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "noticeId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_encyclopedia_categories: {
		method: "GET",
		path: "/api/v1/encyclopedia/categories",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [],
		headerParams: []
	},
	get_encyclopedia: {
		method: "GET",
		path: "/api/v1/encyclopedia",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [
			{
				schema: {
					type: "string",
					minLength: 0
				},
				name: "cursor",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "category",
				required: true,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "subCategory",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: {
					type: "integer",
					minimum: 1
				},
				name: "page",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "integer" },
				name: "pageSize",
				required: false,
				style: "form",
				explode: true
			}
		],
		headerParams: []
	},
	get_encyclopedia_category_entryId: {
		method: "GET",
		path: "/api/v1/encyclopedia/{category}/{entryId}",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: { type: "string" },
			name: "category",
			required: true,
			style: "simple",
			explode: false
		}, {
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "entryId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: []
	},
	get_content_tianshu: {
		method: "GET",
		path: "/api/v1/content/tianshu",
		security: [{ RobotBearer: [] }, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [{
			name: "view",
			required: false,
			style: "form",
			explode: true,
			schema: {
				type: "string",
				enum: ["access"]
			}
		}],
		headerParams: []
	},
	get_players_id_memories: {
		method: "GET",
		path: "/api/v1/players/{id}/memories",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: []
	},
	get_players_id_story: {
		method: "GET",
		path: "/api/v1/players/{id}/story",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: []
	},
	get_notices: {
		method: "GET",
		path: "/api/v1/notices",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [{
			schema: { type: "integer" },
			name: "page",
			required: false,
			style: "form",
			explode: true
		}, {
			schema: { type: "integer" },
			name: "pageSize",
			required: false,
			style: "form",
			explode: true
		}],
		headerParams: []
	},
	get_notices_noticeId: {
		method: "GET",
		path: "/api/v1/notices/{noticeId}",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "noticeId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: []
	},
	get_feedback_categories: {
		method: "GET",
		path: "/api/v1/feedback/categories",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [],
		headerParams: []
	},
	get_feedback_mine: {
		method: "GET",
		path: "/api/v1/feedback/mine",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [
			{
				schema: { type: "integer" },
				name: "page",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "integer" },
				name: "pageSize",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "cursor",
				required: false,
				style: "form",
				explode: true
			}
		],
		headerParams: []
	},
	post_feedback: {
		method: "POST",
		path: "/api/v1/feedback",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [],
		headerParams: [{
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_glossary: {
		method: "GET",
		path: "/api/v1/glossary",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [
			{
				schema: { type: "string" },
				name: "keyword",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "category",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "integer" },
				name: "page",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "integer" },
				name: "pageSize",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "cursor",
				required: false,
				style: "form",
				explode: true
			}
		],
		headerParams: []
	},
	get_glossary_categories: {
		method: "GET",
		path: "/api/v1/glossary/categories",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [],
		headerParams: []
	},
	get_glossary_policy: {
		method: "GET",
		path: "/api/v1/glossary/policy",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [{
			schema: { type: "string" },
			name: "category",
			required: false,
			style: "form",
			explode: true
		}],
		headerParams: []
	},
	get_glossary_edit_applications_mine: {
		method: "GET",
		path: "/api/v1/glossary/edit-applications/mine",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [],
		headerParams: []
	},
	post_glossary_edit_applications: {
		method: "POST",
		path: "/api/v1/glossary/edit-applications",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [],
		headerParams: [{
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	put_glossary_keyword: {
		method: "PUT",
		path: "/api/v1/glossary/{keyword}",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "string",
				minLength: 1
			},
			name: "keyword",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Repeat-Command",
			required: false,
			style: "simple",
			explode: false
		}, {
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	delete_glossary_keyword: {
		method: "DELETE",
		path: "/api/v1/glossary/{keyword}",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "string",
				maxLength: 30
			},
			name: "keyword",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Repeat-Command",
			required: false,
			style: "simple",
			explode: false
		}, {
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_tianshi_baolu: {
		method: "GET",
		path: "/api/v1/tianshi-baolu",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [
			{
				schema: {
					type: "string",
					enum: [
						"all",
						"equipment_set",
						"skill_book",
						"soul_artifact"
					]
				},
				name: "type",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: {
					type: "integer",
					minimum: 1
				},
				name: "page",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: {
					type: "integer",
					minimum: 1,
					maximum: 5
				},
				name: "pageSize",
				required: false,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "cursor",
				required: false,
				style: "form",
				explode: true
			}
		],
		headerParams: []
	},
	post_players_id_tianshi_baolu_unlocks_sync: {
		method: "POST",
		path: "/api/v1/players/{id}/tianshi-baolu/unlocks/sync",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: []
	}
};

//#endregion
export { communityOperationDefinitions };