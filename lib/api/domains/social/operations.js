//#region src/api/domains/social/operations.ts
const socialOperationDefinitions = {
	post_players_id_flymail_mute_command: {
		method: "POST",
		path: "/api/v1/players/{id}/flymail/mute-command",
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
	post_players_id_friends_workflow: {
		method: "POST",
		path: "/api/v1/players/{id}/friends/workflow",
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
				name: "X-Request-ID",
				required: false,
				style: "simple",
				explode: false
			},
			{
				name: "Idempotency-Key",
				required: false,
				style: "simple",
				explode: false
			}
		]
	},
	post_players_id_blocklist_by_name: {
		method: "POST",
		path: "/api/v1/players/{id}/blocklist/by-name",
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
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_friend_requests_requestId_reject: {
		method: "POST",
		path: "/api/v1/players/{id}/friend-requests/{requestId}/reject",
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
			name: "requestId",
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
	get_players_id_friends_removal_target: {
		method: "GET",
		path: "/api/v1/players/{id}/friends/removal-target",
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
			schema: { type: "string" },
			name: "targetUid",
			required: false,
			style: "form",
			explode: true
		}, {
			schema: { type: "string" },
			name: "targetBid",
			required: false,
			style: "form",
			explode: true
		}],
		headerParams: []
	},
	get_players_id_friend_request_preference: {
		method: "GET",
		path: "/api/v1/players/{id}/friend-request-preference",
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
	patch_players_id_friend_request_preference: {
		method: "PATCH",
		path: "/api/v1/players/{id}/friend-request-preference",
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
	post_players_id_blocklist_removal: {
		method: "POST",
		path: "/api/v1/players/{id}/blocklist/removal",
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
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_friends_random: {
		method: "GET",
		path: "/api/v1/players/{id}/friends/random",
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
	get_players_id_social_access: {
		method: "GET",
		path: "/api/v1/players/{id}/social/access",
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
	get_players_id_friends: {
		method: "GET",
		path: "/api/v1/players/{id}/friends",
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
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	get_players_id_friend_requests: {
		method: "GET",
		path: "/api/v1/players/{id}/friend-requests",
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
	post_players_id_friend_requests: {
		method: "POST",
		path: "/api/v1/players/{id}/friend-requests",
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
	post_players_id_friend_requests_requestId_accept: {
		method: "POST",
		path: "/api/v1/players/{id}/friend-requests/{requestId}/accept",
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
			name: "requestId",
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
	delete_players_id_friends_friendId: {
		method: "DELETE",
		path: "/api/v1/players/{id}/friends/{friendId}",
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
			name: "friendId",
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
	get_players_id_blocklist: {
		method: "GET",
		path: "/api/v1/players/{id}/blocklist",
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
	post_players_id_blocklist: {
		method: "POST",
		path: "/api/v1/players/{id}/blocklist",
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
	delete_players_id_blocklist_blockedUserId: {
		method: "DELETE",
		path: "/api/v1/players/{id}/blocklist/{blockedUserId}",
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
			name: "blockedUserId",
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
	}
};

//#endregion
export { socialOperationDefinitions };