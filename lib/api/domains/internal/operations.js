//#region src/api/domains/internal/operations.ts
const internalOperationDefinitions = {
	get_internal_v1_task_config: {
		method: "GET",
		path: "/api/v1/internal/task-config",
		security: [{ WorkerToken: [] }],
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
	get_internal_v1_jobs: {
		method: "GET",
		path: "/api/v1/internal/jobs",
		security: [{ WorkerToken: [] }],
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
	post_internal_v1_jobs_name_run: {
		method: "POST",
		path: "/api/v1/internal/jobs/{name}/run",
		security: [{ WorkerToken: [] }],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: { type: "string" },
			name: "name",
			required: true,
			style: "simple",
			explode: false
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
	post_internal_v1_jobs_name_compensate: {
		method: "POST",
		path: "/api/v1/internal/jobs/{name}/compensate",
		security: [{ WorkerToken: [] }],
		requestContentType: "application/json",
		bodyRequired: true,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: { type: "string" },
			name: "name",
			required: true,
			style: "simple",
			explode: false
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
	post_internal_v1_workers_name_run: {
		method: "POST",
		path: "/api/v1/internal/workers/{name}/run",
		security: [{ WorkerToken: [] }],
		requestContentType: "application/json",
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "string",
				enum: [
					"scheduled-email",
					"red-packet-expiry",
					"sha-qi-decay",
					"native-comeback-active-flush",
					"custom-gift-recovery",
					"bounty-expiry",
					"guild-shop-auto-refresh",
					"market-listing-expiry",
					"cave-plot-maturity",
					"guild-secret-realm-war-reset",
					"companion-anniversary",
					"team-match",
					"tower-daily-check",
					"guild-competition-phase",
					"guild-competition-odds-refresh",
					"push-message-relay"
				]
			},
			name: "name",
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
	post_internal_v1_workers_name_compensate: {
		method: "POST",
		path: "/api/v1/internal/workers/{name}/compensate",
		security: [{ WorkerToken: [] }],
		requestContentType: "application/json",
		bodyRequired: false,
		responseKind: "json",
		responseEnvelope: true,
		pathParams: [{
			schema: {
				type: "string",
				enum: [
					"scheduled-email",
					"red-packet-expiry",
					"sha-qi-decay",
					"native-comeback-active-flush",
					"custom-gift-recovery",
					"bounty-expiry",
					"guild-shop-auto-refresh",
					"market-listing-expiry",
					"cave-plot-maturity",
					"guild-secret-realm-war-reset",
					"companion-anniversary",
					"team-match",
					"tower-daily-check",
					"guild-competition-phase",
					"guild-competition-odds-refresh",
					"push-message-relay"
				]
			},
			name: "name",
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
export { internalOperationDefinitions };