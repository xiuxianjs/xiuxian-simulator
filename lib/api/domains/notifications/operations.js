//#region src/api/domains/notifications/operations.ts
const notificationsOperationDefinitions = {
	get_players_id_notifications_group_subscription: {
		method: "GET",
		path: "/api/v1/players/{id}/notifications/group-subscription",
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
	get_players_id_notifications: {
		method: "GET",
		path: "/api/v1/players/{id}/notifications",
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
					minimum: 1,
					maximum: 1e6
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
		headerParams: []
	},
	get_players_id_notification_subscription: {
		method: "GET",
		path: "/api/v1/players/{id}/notification-subscription",
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
	put_players_id_notification_subscription: {
		method: "PUT",
		path: "/api/v1/players/{id}/notification-subscription",
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
	delete_players_id_notification_subscription: {
		method: "DELETE",
		path: "/api/v1/players/{id}/notification-subscription",
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
	}
};

//#endregion
export { notificationsOperationDefinitions };