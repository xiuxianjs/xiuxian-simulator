// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { APIClient, RequestArguments } from '../../core/index.js';
export type { AccountOperations } from './types.js';
export { accountOperationDefinitions } from './operations.js';

export function createAccountApi(client: APIClient) {
  return {
    post_auth_roles_switch: (...args: RequestArguments<'post_auth_roles_switch'>) => {
      return client.request('post_auth_roles_switch', ...args);
    }
  };
}
