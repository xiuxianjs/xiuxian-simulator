// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

export const accountOperationDefinitions = {
  post_auth_roles_switch: {
    method: 'POST',
    path: '/api/v1/auth/roles/switch',
    security: [
      {
        RobotBearer: [],
        RobotBid: []
      }
    ],
    requestContentType: 'application/json',
    bodyRequired: true,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [],
    queryParams: [],
    headerParams: [
      {
        name: 'Idempotency-Key',
        required: true,
        style: 'simple',
        explode: false
      }
    ]
  }
} as const;
