import { statusOperationDefinitions } from "./operations.js";

//#region src/api/domains/status/index.ts
function createStatusApi(client) {
	return {
		get_livez: (...args) => {
			return client.request("get_livez", ...args);
		},
		get_readyz: (...args) => {
			return client.request("get_readyz", ...args);
		},
		get_healthz: (...args) => {
			return client.request("get_healthz", ...args);
		},
		get_version: (...args) => {
			return client.request("get_version", ...args);
		},
		get_metrics: (...args) => {
			return client.request("get_metrics", ...args);
		}
	};
}

//#endregion
export { createStatusApi, statusOperationDefinitions };