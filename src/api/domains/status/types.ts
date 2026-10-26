// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface StatusOperations {
  get_livez: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: { status: 'live' } };
  get_readyz: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: { status: 'ready' } };
  get_healthz: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: { status: 'ready' } };
  get_version: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: { version: string } };
  get_metrics: { path: never; query: never; headers: { 'X-Request-ID'?: string }; body: never; response: string };
}
