// HTTP metadata aligned with Go docs/openapi.yaml; keep DTOs separately reviewed and verify with yarn test:contracts.
export const inventoryOperationDefinitions = {
  post_players_id_mingwu_dan_confirm: {
    method: 'POST',
    path: '/api/v1/players/{id}/mingwu-dan/confirm',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: 'application/json',
    bodyRequired: true,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: true, style: 'simple', explode: false },
      { name: 'X-Request-ID', required: false, style: 'simple', explode: false }
    ]
  },
  post_players_id_consume: {
    method: 'POST',
    path: '/api/v1/players/{id}/consume',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: 'application/json',
    bodyRequired: true,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: true, style: 'simple', explode: false },
      { name: 'X-Request-ID', required: false, style: 'simple', explode: false }
    ]
  },
  post_players_id_storage_lock_state: {
    method: 'POST',
    path: '/api/v1/players/{id}/storage/lock-state',
    security: [
      {
        RobotBearer: [],
        RobotBid: []
      },
      {
        UserBearer: []
      }
    ],
    requestContentType: 'application/json',
    bodyRequired: true,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [
      {
        schema: {
          type: 'integer',
          minimum: 1
        },
        name: 'id',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [],
    headerParams: [
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false },
      { name: 'X-Request-ID', required: false, style: 'simple', explode: false }
    ]
  },
  get_players_id_currencies: {
    method: 'GET',
    path: '/api/v1/players/{id}/currencies',
    security: [
      {
        RobotBearer: [],
        RobotBid: []
      },
      {
        UserBearer: []
      }
    ],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [
      {
        schema: {
          type: 'integer',
          minimum: 1
        },
        name: 'id',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [],
    headerParams: [
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  get_players_id_inventory: {
    method: 'GET',
    path: '/api/v1/players/{id}/inventory',
    security: [
      {
        RobotBearer: [],
        RobotBid: []
      },
      {
        UserBearer: []
      }
    ],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [
      {
        schema: {
          type: 'integer',
          minimum: 1
        },
        name: 'id',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [
      {
        schema: {
          type: 'string',
          enum: ['bag']
        },
        name: 'view',
        required: false,
        style: 'form',
        explode: true
      },
      {
        schema: {
          type: 'string'
        },
        name: 'subtype',
        required: false,
        style: 'form',
        explode: true
      },
      {
        schema: {
          type: 'string',
          enum: ['prop', 'material']
        },
        name: 'category',
        required: true,
        style: 'form',
        explode: true
      },
      {
        schema: {
          type: 'integer',
          minimum: 1
        },
        name: 'page',
        required: false,
        style: 'form',
        explode: true
      },
      {
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100
        },
        name: 'pageSize',
        required: false,
        style: 'form',
        explode: true
      }
    ],
    headerParams: [
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  get_players_id_inventory_space: {
    method: 'GET',
    path: '/api/v1/players/{id}/inventory/space',
    security: [
      {
        RobotBearer: [],
        RobotBid: []
      },
      {
        UserBearer: []
      }
    ],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [
      {
        schema: {
          type: 'integer',
          minimum: 1
        },
        name: 'id',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [],
    headerParams: [
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  }
} as const;
