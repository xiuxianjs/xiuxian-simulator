// HTTP metadata aligned with Go docs/openapi.yaml; keep DTOs separately reviewed and verify with yarn test:contracts.
export const partnersOperationDefinitions = {
  get_players_id_companion_proposal_preflight: {
    method: 'GET',
    path: '/api/v1/players/{id}/companion/proposal-preflight',
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
          type: 'string'
        },
        name: 'target',
        required: false,
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
  get_players_id_companion_proposals: {
    method: 'GET',
    path: '/api/v1/players/{id}/companion/proposals',
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
  get_players_id_companion_gift_targets: {
    method: 'GET',
    path: '/api/v1/players/{id}/companion/gift-targets',
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
          type: 'string'
        },
        name: 'giftName',
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
  get_players_id_companion_gift_options_targetId: {
    method: 'GET',
    path: '/api/v1/players/{id}/companion/gift-options/{targetId}',
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
      },
      {
        schema: {
          type: 'integer',
          minimum: 1
        },
        name: 'targetId',
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
  get_players_id_companion: {
    method: 'GET',
    path: '/api/v1/players/{id}/companion',
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
  delete_players_id_companion: {
    method: 'DELETE',
    path: '/api/v1/players/{id}/companion',
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
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_companion_proposals: {
    method: 'POST',
    path: '/api/v1/players/{id}/companion/proposals',
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
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_companion_proposals_proposerId_accept: {
    method: 'POST',
    path: '/api/v1/players/{id}/companion/proposals/{proposerId}/accept',
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
      },
      {
        schema: {
          type: 'integer',
          minimum: 1
        },
        name: 'proposerId',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [],
    headerParams: [
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_companion_proposals_proposerId_reject: {
    method: 'POST',
    path: '/api/v1/players/{id}/companion/proposals/{proposerId}/reject',
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
      },
      {
        schema: {
          type: 'integer',
          minimum: 1
        },
        name: 'proposerId',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [],
    headerParams: [
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  get_players_id_companion_tasks: {
    method: 'GET',
    path: '/api/v1/players/{id}/companion/tasks',
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
  get_players_id_companion_panel_status: {
    method: 'GET',
    path: '/api/v1/players/{id}/companion/panel-status',
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
  get_players_id_companion_oath_items: {
    method: 'GET',
    path: '/api/v1/players/{id}/companion/oath-items',
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
  get_players_id_companion_oath_upgrade: {
    method: 'GET',
    path: '/api/v1/players/{id}/companion/oath-upgrade',
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
  post_players_id_companion_oath_upgrade: {
    method: 'POST',
    path: '/api/v1/players/{id}/companion/oath-upgrade',
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
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_companion_dual_cultivation: {
    method: 'POST',
    path: '/api/v1/players/{id}/companion/dual-cultivation',
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
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  get_players_id_companion_gifts: {
    method: 'GET',
    path: '/api/v1/players/{id}/companion/gifts',
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
          enum: ['all', 'send', 'receive']
        },
        name: 'mode',
        required: false,
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
  post_players_id_companion_gifts: {
    method: 'POST',
    path: '/api/v1/players/{id}/companion/gifts',
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
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_companion_shop_purchases_preview: {
    method: 'POST',
    path: '/api/v1/players/{id}/companion/shop/purchases/preview',
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
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_companion_shop_purchases: {
    method: 'POST',
    path: '/api/v1/players/{id}/companion/shop/purchases',
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
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  }
} as const;
