import { robotBusinessV1Operations, robotBusinessV2Operations } from "./business-operations.js";

//#region src/api/domains/auth/operations.ts
const authOperationDefinitions = {
	post_v2_robot_business_operation: {
		method: "POST",
		path: "/api/v2/robot/business/{operation}",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			name: "operation",
			required: true,
			style: "simple",
			explode: false,
			schema: {
				type: "string",
				enum: robotBusinessV2Operations
			}
		}],
		queryParams: [],
		headerParams: [{
			name: "Idempotency-Key",
			required: true,
			style: "simple",
			explode: false
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_v2_robot_home_overview: {
		method: "POST",
		path: "/api/v2/robot/home-overview",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [],
		headerParams: [{
			name: "Idempotency-Key",
			required: true,
			style: "simple",
			explode: false
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_robot_business_operation: {
		method: "POST",
		path: "/api/v1/robot/business/{operation}",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			name: "operation",
			required: true,
			style: "simple",
			explode: false,
			schema: {
				type: "string",
				enum: robotBusinessV1Operations
			}
		}],
		queryParams: [],
		headerParams: [{
			name: "Idempotency-Key",
			required: true,
			style: "simple",
			explode: false
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_robot_home_overview: {
		method: "POST",
		path: "/api/v1/robot/home-overview",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [],
		headerParams: [{
			name: "Idempotency-Key",
			required: true,
			style: "simple",
			explode: false
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_robot_middleware_entry: {
		method: "POST",
		path: "/api/v1/robot/middleware-entry",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [],
		headerParams: [{
			name: "Idempotency-Key",
			required: true,
			style: "simple",
			explode: false
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_robot_command_entry: {
		method: "POST",
		path: "/api/v1/robot/command-entry",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [],
		headerParams: [{
			name: "Idempotency-Key",
			required: true,
			style: "simple",
			explode: false
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	getRobotIdentity: {
		method: "GET",
		path: "/api/v1/robot/identity",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_auth_email_verifications: {
		method: "POST",
		path: "/api/v1/auth/email-verifications",
		security: [{ UserBearer: [] }, {
			RobotBearer: [],
			RobotBid: []
		}],
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
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_auth_email_verifications_type_confirm: {
		method: "POST",
		path: "/api/v1/auth/email-verifications/{type}/confirm",
		security: [{ UserBearer: [] }, {
			RobotBearer: [],
			RobotBid: []
		}],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "string",
				enum: [
					"bind",
					"changeEmail",
					"change"
				]
			},
			name: "type",
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
	put_auth_password: {
		method: "PUT",
		path: "/api/v1/auth/password",
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
	put_players_id_auth_password: {
		method: "PUT",
		path: "/api/v1/players/{id}/auth/password",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}],
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
	get_auth_profile: {
		method: "GET",
		path: "/api/v1/auth/profile",
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
	delete_auth_sessions_sessionId: {
		method: "DELETE",
		path: "/api/v1/auth/sessions/{sessionId}",
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
				minLength: 1
			},
			name: "sessionId",
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
	post_auth_sessions_revoke_others: {
		method: "POST",
		path: "/api/v1/auth/sessions/revoke-others",
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
		headerParams: [{
			name: "Idempotency-Key",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_players_id_auth_temporary_password: {
		method: "POST",
		path: "/api/v1/players/{id}/auth/temporary-password",
		security: [{
			RobotBearer: [],
			RobotBid: []
		}],
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
	post_auth_login: {
		method: "POST",
		path: "/api/v1/auth/login",
		security: [],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
		queryParams: [],
		headerParams: [{
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_auth_refresh: {
		method: "POST",
		path: "/api/v1/auth/refresh",
		security: [],
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
		}, {
			name: "X-Request-ID",
			required: false,
			style: "simple",
			explode: false
		}]
	},
	post_auth_logout: {
		method: "POST",
		path: "/api/v1/auth/logout",
		security: [{ UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
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
	get_auth_sessions: {
		method: "GET",
		path: "/api/v1/auth/sessions",
		security: [{ UserBearer: [] }],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [],
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
export { authOperationDefinitions };