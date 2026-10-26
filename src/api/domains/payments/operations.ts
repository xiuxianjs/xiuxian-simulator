// HTTP metadata aligned with Go docs/openapi.yaml; keep DTOs separately reviewed and verify with yarn test:contracts.
export const paymentsOperationDefinitions = {
  get_players_id_lootboxes: {
    method: 'GET',
    path: '/api/v1/players/{id}/lootboxes',
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
          type: 'integer',
          minimum: 1
        },
        name: 'page',
        required: false,
        style: 'form',
        explode: true
      }
    ],
    headerParams: []
  },
  get_players_id_gacha_overview: {
    method: 'GET',
    path: '/api/v1/players/{id}/gacha/overview',
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
    headerParams: []
  },
  get_players_id_gacha_catalog: {
    method: 'GET',
    path: '/api/v1/players/{id}/gacha/catalog',
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
    headerParams: []
  },
  get_players_id_payments_orders_orderNo_checkout: {
    method: 'GET',
    path: '/api/v1/players/{id}/payments/orders/{orderNo}/checkout',
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
          type: 'string'
        },
        name: 'orderNo',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [],
    headerParams: []
  },
  get_capabilities: {
    method: 'GET',
    path: '/api/v1/capabilities',
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
    pathParams: [],
    queryParams: [],
    headerParams: []
  },
  get_payments_packages: {
    method: 'GET',
    path: '/api/v1/payments/packages',
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
    pathParams: [],
    queryParams: [],
    headerParams: []
  },
  get_players_id_payments_sponsor_status: {
    method: 'GET',
    path: '/api/v1/players/{id}/payments/sponsor-status',
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
  post_players_id_payments_orders: {
    method: 'POST',
    path: '/api/v1/players/{id}/payments/orders',
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
        required: true,
        style: 'simple',
        explode: false
      }
    ]
  },
  get_players_id_payments_orders: {
    method: 'GET',
    path: '/api/v1/players/{id}/payments/orders',
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
    queryParams: ['page', 'pageSize'].map(name => ({
      name,
      required: false,
      style: 'form' as const,
      explode: true,
      schema: { type: 'integer' as const, minimum: 1 }
    })),
    headerParams: []
  },
  get_players_id_payments_orders_orderNo: {
    method: 'GET',
    path: '/api/v1/players/{id}/payments/orders/{orderNo}',
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
          type: 'string'
        },
        name: 'orderNo',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [],
    headerParams: []
  },
  get_players_id_payments_orders_orderNo_limited_event_settlement: {
    method: 'GET',
    path: '/api/v1/players/{id}/payments/orders/{orderNo}/limited-event-settlement',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [
      { schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false },
      { schema: { type: 'string' }, name: 'orderNo', required: true, style: 'simple', explode: false }
    ],
    queryParams: [],
    headerParams: []
  },
  get_players_id_payments_orders_orderNo_settlement: {
    method: 'GET',
    path: '/api/v1/players/{id}/payments/orders/{orderNo}/settlement',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [
      { schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false },
      { schema: { type: 'string' }, name: 'orderNo', required: true, style: 'simple', explode: false }
    ],
    queryParams: [],
    headerParams: []
  },
  post_players_id_payments_orders_orderNo_cancel: {
    method: 'POST',
    path: '/api/v1/players/{id}/payments/orders/{orderNo}/cancel',
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
          type: 'string'
        },
        name: 'orderNo',
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
      }
    ]
  },
  get_payments_epay_notify: {
    method: 'GET',
    path: '/api/v1/payments/epay/notify',
    security: [],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'text',
    responseEnvelope: false,
    pathParams: [],
    queryParams: [
      {
        schema: {
          type: 'string'
        },
        name: 'pid',
        required: true,
        style: 'form',
        explode: true
      },
      {
        schema: {
          type: 'string'
        },
        name: 'out_trade_no',
        required: true,
        style: 'form',
        explode: true
      },
      {
        schema: {
          type: 'string'
        },
        name: 'trade_no',
        required: true,
        style: 'form',
        explode: true
      },
      {
        schema: {
          type: 'string'
        },
        name: 'trade_status',
        required: true,
        style: 'form',
        explode: true
      },
      {
        schema: {
          type: 'string'
        },
        name: 'money',
        required: true,
        style: 'form',
        explode: true
      },
      {
        schema: {
          type: 'string'
        },
        name: 'timestamp',
        required: true,
        style: 'form',
        explode: true
      },
      {
        schema: {
          type: 'string'
        },
        name: 'sign',
        required: true,
        style: 'form',
        explode: true
      },
      {
        schema: {
          type: 'string'
        },
        name: 'sign_type',
        required: true,
        style: 'form',
        explode: true
      }
    ],
    headerParams: []
  },
  post_payments_epay_notify: {
    method: 'POST',
    path: '/api/v1/payments/epay/notify',
    security: [],
    requestContentType: 'application/x-www-form-urlencoded',
    bodyRequired: true,
    responseKind: 'text',
    responseEnvelope: false,
    pathParams: [],
    queryParams: [],
    headerParams: []
  },
  get_gacha_active_banner: {
    method: 'GET',
    path: '/api/v1/gacha/active-banner',
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
    pathParams: [],
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
  get_players_id_check_in_shop_products: {
    method: 'GET',
    path: '/api/v1/players/{id}/check-in-shop/products',
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
  post_players_id_check_in_shop_products_productId_purchase: {
    method: 'POST',
    path: '/api/v1/players/{id}/check-in-shop/products/{productId}/purchase',
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
      },
      {
        schema: {
          type: 'integer',
          minimum: 1
        },
        name: 'productId',
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
  get_players_id_shop_products: {
    method: 'GET',
    path: '/api/v1/players/{id}/shop/products',
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
        schema: { type: 'string', minLength: 0 },
        name: 'cursor',
        required: false,
        style: 'form',
        explode: true
      },
      {
        schema: {
          type: 'string'
        },
        name: 'shopCode',
        required: false,
        style: 'form',
        explode: true
      },
      {
        schema: {
          type: 'string'
        },
        name: 'currencyCode',
        required: false,
        style: 'form',
        explode: true
      },
      {
        schema: {
          type: 'integer'
        },
        name: 'page',
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
  post_players_id_shop_purchases_preview: {
    method: 'POST',
    path: '/api/v1/players/{id}/shop/purchases/preview',
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
  post_players_id_shop_purchases: {
    method: 'POST',
    path: '/api/v1/players/{id}/shop/purchases',
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
  get_gacha_banner: {
    method: 'GET',
    path: '/api/v1/gacha/banner',
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
    pathParams: [],
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
  post_players_id_gacha_pulls: {
    method: 'POST',
    path: '/api/v1/players/{id}/gacha/pulls',
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
  post_players_id_lootboxes_open: {
    method: 'POST',
    path: '/api/v1/players/{id}/lootboxes/open',
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
  get_gacha_pools_poolId_items: {
    method: 'GET',
    path: '/api/v1/gacha/pools/{poolId}/items',
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
        name: 'poolId',
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
  get_players_id_gacha_pools_poolId_pity: {
    method: 'GET',
    path: '/api/v1/players/{id}/gacha/pools/{poolId}/pity',
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
        name: 'poolId',
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
  get_players_id_gacha_pools_poolId_history: {
    method: 'GET',
    path: '/api/v1/players/{id}/gacha/pools/{poolId}/history',
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
        name: 'poolId',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [
      {
        schema: {
          type: 'integer'
        },
        name: 'limit',
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
  post_players_id_gacha_pools_poolId_pull: {
    method: 'POST',
    path: '/api/v1/players/{id}/gacha/pools/{poolId}/pull',
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
      },
      {
        schema: {
          type: 'integer',
          minimum: 1
        },
        name: 'poolId',
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
  get_players_id_limited_events_shop_products: {
    method: 'GET',
    path: '/api/v1/players/{id}/limited-events/shop-products',
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
          type: 'integer',
          minimum: 1
        },
        name: 'shopType',
        required: true,
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
  post_players_id_limited_events_shop_products_productId_purchase: {
    method: 'POST',
    path: '/api/v1/players/{id}/limited-events/shop-products/{productId}/purchase',
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
        name: 'productId',
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
