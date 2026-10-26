import { internalOperationDefinitions } from "./operations.js";

//#region src/api/domains/internal/index.ts
function createInternalApi(client) {
	return {
		get_internal_v1_task_config: (...args) => {
			return client.request("get_internal_v1_task_config", ...args);
		},
		get_internal_v1_jobs: (...args) => {
			return client.request("get_internal_v1_jobs", ...args);
		},
		post_internal_v1_jobs_name_run: (...args) => {
			return client.request("post_internal_v1_jobs_name_run", ...args);
		},
		post_internal_v1_jobs_name_compensate: (...args) => {
			return client.request("post_internal_v1_jobs_name_compensate", ...args);
		},
		post_internal_v1_workers_name_run: (...args) => {
			return client.request("post_internal_v1_workers_name_run", ...args);
		},
		post_internal_v1_workers_name_compensate: (...args) => {
			return client.request("post_internal_v1_workers_name_compensate", ...args);
		}
	};
}

//#endregion
export { createInternalApi, internalOperationDefinitions };