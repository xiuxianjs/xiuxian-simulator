// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface AccountOperations {
  post_auth_roles_switch: {
    path: never;
    query: never;
    headers: { 'Idempotency-Key': string };
    body: { targetPlayerId: number };
    response: { fromUid: number; fromName: string; toUid: number; toName: string; cacheCleared: boolean };
  };
}
