//#region src/api/domains/account/operations.ts
const accountOperationDefinitions = { post_auth_roles_switch: {
	method: "POST",
	path: "/api/v1/auth/roles/switch",
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
	}]
} };

//#endregion
export { accountOperationDefinitions };