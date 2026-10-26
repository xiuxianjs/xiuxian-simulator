//#region src/api/domains/sect-realms/operations.ts
const sectRealmsOperationDefinitions = {
	get_guilds_guildId_members: {
		method: "GET",
		path: "/api/v1/guilds/{guildId}/members",
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
			name: "guildId",
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
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_guilds: {
		method: "POST",
		path: "/api/v1/players/{id}/guilds",
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
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	delete_players_id_guilds_guildId: {
		method: "DELETE",
		path: "/api/v1/players/{id}/guilds/{guildId}",
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
			name: "guildId",
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
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_guild_leadership_transfer: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/leadership/transfer",
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
				type: "integer",
				minimum: 1
			},
			name: "id",
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
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_guild_leadership_impeach: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/leadership/impeach",
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
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	get_guilds_guildId_permissions: {
		method: "GET",
		path: "/api/v1/guilds/{guildId}/permissions",
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
			name: "guildId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [
			{
				schema: {
					type: "integer",
					minimum: 1
				},
				name: "userId",
				required: true,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "action",
				required: true,
				style: "form",
				explode: true
			},
			{
				schema: { type: "string" },
				name: "targetRole",
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
	post_players_id_guild_checkin: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/checkin",
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
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	get_guilds_guildId_essences: {
		method: "GET",
		path: "/api/v1/guilds/{guildId}/essences",
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
			name: "guildId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_guild_essences: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/essences",
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
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Request-ID",
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
	delete_players_id_guild_essences_essenceId: {
		method: "DELETE",
		path: "/api/v1/players/{id}/guild/essences/{essenceId}",
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
				minimum: 0
			},
			name: "essenceId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Request-ID",
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
	post_players_id_guild_mining: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/mining",
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
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	get_players_id_guild_worship: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/worship",
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
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_guild_worship: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/worship",
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
				type: "integer",
				minimum: 1
			},
			name: "id",
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
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_guild_stipend_claim: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/stipend/claim",
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
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	get_players_id_guild_shop: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/shop",
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
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_guild_shop_page: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/shop/page",
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
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_guild_shop_auto_refresh: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/shop/auto-refresh",
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
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_guild_shop_auto_refresh_write_context: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/shop/auto-refresh/write-context",
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
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	patch_players_id_guild_shop_auto_refresh: {
		method: "PATCH",
		path: "/api/v1/players/{id}/guild/shop/auto-refresh",
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
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_guild_leadership: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/leadership",
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
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_guild_shop_exchange: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/shop/exchange",
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
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	get_players_id_guild_applications: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/applications",
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
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_guild_applications: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/applications",
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
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	post_players_id_guild_applications_users_targetId_approve: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/applications/users/{targetId}/approve",
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
			name: "targetId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	post_players_id_guild_applications_users_targetId_reject: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/applications/users/{targetId}/reject",
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
			name: "targetId",
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
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_guild_leave: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/leave",
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
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	get_guilds_guildId_applications: {
		method: "GET",
		path: "/api/v1/guilds/{guildId}/applications",
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
			name: "guildId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "operatorId",
			required: true,
			style: "form",
			explode: true
		}],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_guilds_guildId_applications_applicationId_approve: {
		method: "POST",
		path: "/api/v1/guilds/{guildId}/applications/{applicationId}/approve",
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
			name: "guildId",
			required: true,
			style: "simple",
			explode: false
		}, {
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "applicationId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "operatorId",
			required: true,
			style: "form",
			explode: true
		}],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_guilds_guildId_applications_applicationId_reject: {
		method: "POST",
		path: "/api/v1/guilds/{guildId}/applications/{applicationId}/reject",
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
			name: "guildId",
			required: true,
			style: "simple",
			explode: false
		}, {
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "applicationId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "operatorId",
			required: true,
			style: "form",
			explode: true
		}],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	delete_players_id_guild_applications_applicationId: {
		method: "DELETE",
		path: "/api/v1/players/{id}/guild/applications/{applicationId}",
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
				minimum: 0
			},
			name: "applicationId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	post_players_id_guild_role: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/role",
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
				type: "integer",
				minimum: 1
			},
			name: "id",
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
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_guild_kick_targetId: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/kick/{targetId}",
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
			name: "targetId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	post_players_id_guild_shop_refresh: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/shop/refresh",
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
		headerParams: [{
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_guild_upgrade: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/upgrade",
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
				type: "integer",
				minimum: 1
			},
			name: "id",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	get_players_id_secret_realms_home: {
		method: "GET",
		path: "/api/v1/players/{id}/secret-realms/home",
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
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_secret_realms: {
		method: "GET",
		path: "/api/v1/secret-realms",
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
					maximum: 100
				},
				name: "pageSize",
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
	get_secret_realms_realmNo: {
		method: "GET",
		path: "/api/v1/secret-realms/{realmNo}",
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
			name: "realmNo",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [{
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "page",
			required: false,
			style: "form",
			explode: true
		}, {
			schema: {
				type: "integer",
				minimum: 1,
				maximum: 100
			},
			name: "pageSize",
			required: false,
			style: "form",
			explode: true
		}],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_guilds_guildId_secret_realms_scoreboard: {
		method: "GET",
		path: "/api/v1/guilds/{guildId}/secret-realms/scoreboard",
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
			name: "guildId",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_secret_realms_realmNo_positions_positionNo_challenge: {
		method: "POST",
		path: "/api/v1/players/{id}/secret-realms/{realmNo}/positions/{positionNo}/challenge",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [
			{
				schema: {
					type: "integer",
					minimum: 1
				},
				name: "id",
				required: true,
				style: "simple",
				explode: false
			},
			{
				schema: {
					type: "integer",
					minimum: 1
				},
				name: "realmNo",
				required: true,
				style: "simple",
				explode: false
			},
			{
				schema: {
					type: "integer",
					minimum: 1
				},
				name: "positionNo",
				required: true,
				style: "simple",
				explode: false
			}
		],
		queryParams: [],
		headerParams: [{
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_secret_realms_claim: {
		method: "POST",
		path: "/api/v1/players/{id}/secret-realms/claim",
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
		headerParams: [{
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_guild_leader_leave: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/leader-leave",
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
		headerParams: [
			{
				name: "X-Repeat-Command",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	post_players_id_guild_resign: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/resign",
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
		headerParams: [{
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	}
};

//#endregion
export { sectRealmsOperationDefinitions };