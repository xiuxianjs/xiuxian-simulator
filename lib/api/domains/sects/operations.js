//#region src/api/domains/sects/operations.ts
const sectsOperationDefinitions = {
	post_players_id_guild_workflow: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/workflow",
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
			name: "X-Repeat-Command",
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
	delete_players_id_guild_leave_confirmation: {
		method: "DELETE",
		path: "/api/v1/players/{id}/guild/leave-confirmation",
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
		}]
	},
	get_players_id_guild_realm_options: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/realm-options",
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
	get_players_id_guild_home: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/home",
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
	patch_players_id_guild_min_realm: {
		method: "PATCH",
		path: "/api/v1/players/{id}/guild/min-realm",
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
		}]
	},
	post_players_id_guild_rename: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/rename",
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
		}]
	},
	patch_players_id_guild_content: {
		method: "PATCH",
		path: "/api/v1/players/{id}/guild/content",
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
		}]
	},
	get_players_id_guild_essences: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/essences",
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
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "page",
			required: false,
			style: "form",
			explode: true
		}],
		headerParams: []
	},
	get_players_id_guild_content: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/content",
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
	post_players_id_guild_activity: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/activity",
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
		}]
	},
	get_players_id_guild_role_options: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/role-options",
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
	get_players_id_guild_resignation_options: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/resignation-options",
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
	get_players_id_guild_review_applications: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/review-applications",
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
			schema: {
				type: "integer",
				minimum: 1
			},
			name: "page",
			required: false,
			style: "form",
			explode: true
		}, {
			schema: { type: "string" },
			name: "cursor",
			required: false,
			style: "form",
			explode: true
		}],
		headerParams: []
	},
	get_players_id_guild_members: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/members",
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
		headerParams: []
	},
	get_players_id_guild_logs: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/logs",
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
		headerParams: []
	},
	get_guilds: {
		method: "GET",
		path: "/api/v1/guilds",
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
		headerParams: []
	},
	get_guilds_guildId_logs: {
		method: "GET",
		path: "/api/v1/guilds/{guildId}/logs",
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
	get_players_id_guild_milestones_types_type: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/milestones/types/{type}",
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
				type: "string",
				enum: ["daily_activity", "weekly_activity"]
			},
			name: "type",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: []
	},
	get_players_id_guild_red_packets: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/red-packets",
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
	post_players_id_guild_red_packets: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/red-packets",
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
		}]
	},
	get_players_id_guild_red_packets_mine: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/red-packets/mine",
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
	get_players_id_guild_storyline_records: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/storyline/records",
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
	get_players_id_guild_tasks_type: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/tasks/{type}",
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
				type: "string",
				enum: ["daily", "weekly"]
			},
			name: "type",
			required: true,
			style: "simple",
			explode: false
		}],
		queryParams: [],
		headerParams: []
	},
	get_players_id_guild_storyline: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/storyline",
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
	post_players_id_guild_storyline_challenge: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/storyline/challenge",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}, { UserBearer: [] }],
		requestContentType: "application/json",
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
			name: "X-Repeat-Command",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_guild_storyline_stages_stageIndex_claim: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/storyline/stages/{stageIndex}/claim",
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
				minimum: 1,
				maximum: 4
			},
			name: "stageIndex",
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
	post_players_id_guild_red_packets_packetId_claim: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/red-packets/{packetId}/claim",
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
			name: "packetId",
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
	post_players_id_guild_red_packets_packetId_recycle: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/red-packets/{packetId}/recycle",
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
			name: "packetId",
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
	post_players_id_guild_milestones_claims_milestoneId: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/milestones/claims/{milestoneId}",
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
			name: "milestoneId",
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
	post_players_id_guild_milestones_types_type_claim_all: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/milestones/types/{type}/claim-all",
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
				type: "string",
				enum: ["daily_activity", "weekly_activity"]
			},
			name: "type",
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
	get_players_id_guild_battle_training: {
		method: "GET",
		path: "/api/v1/players/{id}/guild/battle-training",
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
	post_players_id_guild_battle_training: {
		method: "POST",
		path: "/api/v1/players/{id}/guild/battle-training",
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
	}
};

//#endregion
export { sectsOperationDefinitions };