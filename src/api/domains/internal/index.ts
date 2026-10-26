// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { InternalOperations } from './types.js';
export { internalOperationDefinitions } from './operations.js';

export function createInternalApi(client: APIClient) {
  return {
    get_internal_v1_task_config: (...args: RequestArguments<'get_internal_v1_task_config'>) => {
      return client.request('get_internal_v1_task_config', ...args);
    },
    get_internal_v1_jobs: (...args: RequestArguments<'get_internal_v1_jobs'>) => {
      return client.request('get_internal_v1_jobs', ...args);
    },
    post_internal_v1_jobs_name_run: (...args: RequestArguments<'post_internal_v1_jobs_name_run'>) => {
      return client.request('post_internal_v1_jobs_name_run', ...args);
    },
    post_internal_v1_jobs_name_compensate: (...args: RequestArguments<'post_internal_v1_jobs_name_compensate'>) => {
      return client.request('post_internal_v1_jobs_name_compensate', ...args);
    },
    post_internal_v1_workers_name_run: (...args: RequestArguments<'post_internal_v1_workers_name_run'>) => {
      return client.request('post_internal_v1_workers_name_run', ...args);
    },
    post_internal_v1_workers_name_compensate: (...args: RequestArguments<'post_internal_v1_workers_name_compensate'>) => {
      return client.request('post_internal_v1_workers_name_compensate', ...args);
    }
  };
}
