// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { StatusOperations } from './types.js';
export { statusOperationDefinitions } from './operations.js';

export function createStatusApi(client: APIClient) {
  return {
    get_livez: (...args: RequestArguments<'get_livez'>) => {
      return client.request('get_livez', ...args);
    },
    get_readyz: (...args: RequestArguments<'get_readyz'>) => {
      return client.request('get_readyz', ...args);
    },
    get_healthz: (...args: RequestArguments<'get_healthz'>) => {
      return client.request('get_healthz', ...args);
    },
    get_version: (...args: RequestArguments<'get_version'>) => {
      return client.request('get_version', ...args);
    },
    get_metrics: (...args: RequestArguments<'get_metrics'>) => {
      return client.request('get_metrics', ...args);
    }
  };
}
