// HTTP metadata aligned with Go docs/openapi.yaml; keep DTOs separately reviewed and verify with yarn test:contracts.
export const playersOperationDefinitions = {
  get_players_id_referral_invitees: {
    method: 'GET',
    path: '/api/v1/players/{id}/referral/invitees',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ name: 'id', required: true, style: 'simple', explode: false, schema: { type: 'integer', minimum: 1 } }],
    queryParams: [
      { name: 'page', required: false, style: 'form', explode: true, schema: { type: 'integer', minimum: 1, default: 1 } },
      { name: 'pageSize', required: false, style: 'form', explode: true, schema: { type: 'integer', minimum: 1, maximum: 20, default: 5 } }
    ],
    headerParams: [{ name: 'X-Request-ID', required: false, style: 'simple', explode: false }]
  },
  post_players_id_query_presentations: {
    method: 'POST',
    path: '/api/v1/players/{id}/query-presentations',
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
      },
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      },
      {
        name: 'X-Repeat-Command',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_companion_gifts_command: {
    method: 'POST',
    path: '/api/v1/players/{id}/companion/gifts/command',
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
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      },
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_companion_proposals_command: {
    method: 'POST',
    path: '/api/v1/players/{id}/companion/proposals/command',
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
      },
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_tianshi_baolu_panel_query: {
    method: 'POST',
    path: '/api/v1/players/{id}/tianshi-baolu/panel-query',
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
          enum: ['all', 'equipment_set', 'skill_book', 'soul_artifact']
        },
        name: 'type',
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
      }
    ],
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
  post_players_id_companion_shop_purchases_overview: {
    method: 'POST',
    path: '/api/v1/players/{id}/companion/shop/purchases/overview',
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
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      },
      {
        name: 'Idempotency-Key',
        required: true,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_shop_purchases_overview: {
    method: 'POST',
    path: '/api/v1/players/{id}/shop/purchases/overview',
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
      },
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_gacha_named_poolName_pull: {
    method: 'POST',
    path: '/api/v1/players/{id}/gacha/named/{poolName}/pull',
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
          type: 'string'
        },
        name: 'poolName',
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
      },
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  get_players_id_gacha_named_poolName_view: {
    method: 'GET',
    path: '/api/v1/players/{id}/gacha/named/{poolName}/{view}',
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
        name: 'poolName',
        required: true,
        style: 'simple',
        explode: false
      },
      {
        schema: {
          type: 'string',
          enum: ['goods', 'history']
        },
        name: 'view',
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
  post_players_id_market_shop_overview_ensure: {
    method: 'POST',
    path: '/api/v1/players/{id}/market/shop/overview/ensure',
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
      },
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_companion_proposals_overview: {
    method: 'POST',
    path: '/api/v1/players/{id}/companion/proposals/overview',
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
      },
      {
        name: 'Idempotency-Key',
        required: true,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_companion_confirmation_action: {
    method: 'POST',
    path: '/api/v1/players/{id}/companion/confirmation/{action}',
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
          type: 'string',
          enum: ['upgrade', 'breakup']
        },
        name: 'action',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      },
      {
        name: 'Idempotency-Key',
        required: true,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_companion_proposals_by_name_action: {
    method: 'POST',
    path: '/api/v1/players/{id}/companion/proposals/by-name/{action}',
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
          type: 'string',
          enum: ['accept', 'reject']
        },
        name: 'action',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      },
      {
        name: 'Idempotency-Key',
        required: true,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_recharge_first_tiers_tierAmount_claim_overview: {
    method: 'POST',
    path: '/api/v1/players/{id}/recharge/first/tiers/{tierAmount}/claim-overview',
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
        name: 'tierAmount',
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
        required: true,
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
  post_players_id_recharge_month_card_daily_rewards_claim_overview: {
    method: 'POST',
    path: '/api/v1/players/{id}/recharge/month-card/daily-rewards/claim-overview',
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
  post_players_id_check_ins_scope_with_ritual: {
    method: 'POST',
    path: '/api/v1/players/{id}/check-ins/{scope}/with-ritual',
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
          type: 'string',
          enum: ['daily', 'newcomer', 'celestial']
        },
        name: 'scope',
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
        required: true,
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
  post_players_id_referral_overview_sync: {
    method: 'POST',
    path: '/api/v1/players/{id}/referral/overview/sync',
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
  get_players_id_settings_overview: {
    method: 'GET',
    path: '/api/v1/players/{id}/settings-overview',
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
          type: 'boolean'
        },
        name: 'includeGroup',
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

  post_players_id_home_overview: {
    method: 'POST',
    path: '/api/v1/players/{id}/home-overview',
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
      { name: 'X-Command-Resource-Receipt', required: false, style: 'simple', explode: false },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },

  get_players_id_activity_hub: {
    method: 'GET',
    path: '/api/v1/players/{id}/activity-hub',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: [{ name: 'X-Request-ID', required: false, style: 'simple', explode: false }]
  },
  post_players_id_guides_newcomer_prepare_promotion: {
    method: 'POST',
    path: '/api/v1/players/{id}/guides/newcomer/prepare-promotion',
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
  post_players_id_guides_newcomer_completion_reward: {
    method: 'POST',
    path: '/api/v1/players/{id}/guides/newcomer/completion-reward',
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
  post_players_id_guides_newcomer_continue: {
    method: 'POST',
    path: '/api/v1/players/{id}/guides/newcomer/continue',
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
      }
    ]
  },
  post_players_id_guides_newcomer_skip: {
    method: 'POST',
    path: '/api/v1/players/{id}/guides/newcomer/skip',
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
      }
    ]
  },
  get_players_id_guides_newcomer: {
    method: 'GET',
    path: '/api/v1/players/{id}/guides/newcomer',
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
  put_players_id_guides_newcomer: {
    method: 'PUT',
    path: '/api/v1/players/{id}/guides/newcomer',
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
    headerParams: []
  },
  delete_players_id_guides_newcomer: {
    method: 'DELETE',
    path: '/api/v1/players/{id}/guides/newcomer',
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
    headerParams: []
  },
  post_players_id_captcha_state_challenge: {
    method: 'POST',
    path: '/api/v1/players/{id}/captcha-state/challenge',
    security: [{ RobotBearer: [], RobotBid: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: []
  },
  post_players_id_captcha_state_verify: {
    method: 'POST',
    path: '/api/v1/players/{id}/captcha-state/verify',
    security: [{ RobotBearer: [], RobotBid: [] }],
    requestContentType: 'application/json',
    bodyRequired: true,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: []
  },
  post_players_id_captcha_state_operations_claim: {
    method: 'POST',
    path: '/api/v1/players/{id}/captcha-state/operations/claim',
    security: [{ RobotBearer: [], RobotBid: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: []
  },
  post_players_id_captcha_state_mute_reply_claim: {
    method: 'POST',
    path: '/api/v1/players/{id}/captcha-state/mute-reply/claim',
    security: [{ RobotBearer: [], RobotBid: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: []
  },
  put_players_id_signature: {
    method: 'PUT',
    path: '/api/v1/players/{id}/signature',
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
      },
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_profile_actions: {
    method: 'POST',
    path: '/api/v1/players/{id}/profile-actions',
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
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      },
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  get_players_id_profile: {
    method: 'GET',
    path: '/api/v1/players/{id}/profile',
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
  post_players_id_home_atmosphere_claim: {
    method: 'POST',
    path: '/api/v1/players/{id}/home-atmosphere/claim',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: [{ name: 'X-Request-ID', required: false, style: 'simple', explode: false }]
  },
  get_players_id_public_profile_targetId: {
    method: 'GET',
    path: '/api/v1/players/{id}/public-profile/{targetId}',
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
  patch_players_id_preferences_dao_crystal_confirmation: {
    method: 'PATCH',
    path: '/api/v1/players/{id}/preferences/dao-crystal-confirmation',
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
    headerParams: []
  },
  patch_players_id_preferences_spirit_crystal_confirmation: {
    method: 'PATCH',
    path: '/api/v1/players/{id}/preferences/spirit-crystal-confirmation',
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
    headerParams: []
  },
  get_players_id_preferences: {
    method: 'GET',
    path: '/api/v1/players/{id}/preferences',
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
  post_players_id_client_state_repeat_record: {
    method: 'POST',
    path: '/api/v1/players/{id}/client-state/repeat-record',
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
    headerParams: []
  },
  patch_players_id_preferences_team_auto_accept_invite: {
    method: 'PATCH',
    path: '/api/v1/players/{id}/preferences/team-auto-accept-invite',
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
    headerParams: []
  },
  patch_players_id_preferences_dungeon_battle_mode: {
    method: 'PATCH',
    path: '/api/v1/players/{id}/preferences/dungeon-battle-mode',
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
    headerParams: []
  },
  patch_players_id_preferences_team_dungeon_energy: {
    method: 'PATCH',
    path: '/api/v1/players/{id}/preferences/team-dungeon-energy',
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
    headerParams: []
  },
  patch_players_id_preferences_team_invites: {
    method: 'PATCH',
    path: '/api/v1/players/{id}/preferences/team-invites',
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
    headerParams: []
  },
  patch_players_id_preferences_friend_team_approval: {
    method: 'PATCH',
    path: '/api/v1/players/{id}/preferences/friend-team-approval',
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
    headerParams: []
  },
  patch_players_id_preferences_profile_visibility: {
    method: 'PATCH',
    path: '/api/v1/players/{id}/preferences/profile-visibility',
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
    headerParams: []
  },
  get_robot_realm_access: {
    method: 'GET',
    path: '/api/v1/robot/realm-access',
    security: [
      {
        RobotBearer: [],
        RobotBid: []
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
  get_players_id_home_overview: {
    method: 'GET',
    path: '/api/v1/players/{id}/home/overview',
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
  get_players_id_task_panel_snapshot: {
    method: 'GET',
    path: '/api/v1/players/{id}/task-panel/snapshot',
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
  get_players_id_task_panel_view: {
    method: 'GET',
    path: '/api/v1/players/{id}/task-panel/view',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [
      { name: 'view', required: false, style: 'form', explode: true, schema: { type: 'string', enum: ['full', 'selected'] } },
      {
        name: 'tab',
        required: false,
        style: 'form',
        explode: true,
        schema: { type: 'string', enum: ['checkin', 'activity', 'cultivation', 'dungeon', 'guild', 'event', 'auto'] }
      }
    ],
    headerParams: []
  },
  get_players_id_home_notifications: {
    method: 'GET',
    path: '/api/v1/players/{id}/home/notifications',
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
  get_players_id_feature_access: {
    method: 'GET',
    path: '/api/v1/players/{id}/feature-access',
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
  get_players_id_check_ins_status: {
    method: 'GET',
    path: '/api/v1/players/{id}/check-ins/status',
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
  get_me: {
    method: 'GET',
    path: '/api/v1/me',
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
  post_players: {
    method: 'POST',
    path: '/api/v1/players',
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
  get_players_id: {
    method: 'GET',
    path: '/api/v1/players/{id}',
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
  get_players_by_bid_bid: {
    method: 'GET',
    path: '/api/v1/players/by-bid/{bid}',
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
          type: 'string',
          minLength: 1
        },
        name: 'bid',
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
  get_players_id_battle_attributes: {
    method: 'GET',
    path: '/api/v1/players/{id}/battle-attributes',
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
  get_players_id_attribute_panel: {
    method: 'GET',
    path: '/api/v1/players/{id}/attribute-panel',
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
