// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export interface CommonSchemas {
  APIError: { code: string; message: string; details?: unknown; requestId?: string };
}
