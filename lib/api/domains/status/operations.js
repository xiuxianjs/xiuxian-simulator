//#region src/api/domains/status/operations.ts
const statusOperationDefinitions = {
	get_livez: {
		method: "GET",
		path: "/livez",
		security: [],
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
	get_readyz: {
		method: "GET",
		path: "/readyz",
		security: [],
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
	get_healthz: {
		method: "GET",
		path: "/healthz",
		security: [],
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
	get_version: {
		method: "GET",
		path: "/version",
		security: [],
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
	get_metrics: {
		method: "GET",
		path: "/metrics",
		security: [],
		requestContentType: null,
		bodyRequired: false,
		responseKind: "text",
		responseEnvelope: false,
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
export { statusOperationDefinitions };