// HTTP metadata aligned with Go docs/openapi.yaml; keep DTOs separately reviewed and verify with yarn test:contracts.
export const benefitsOperationDefinitions = {
  get_players_id_activities_newcomer_login: {
    method: 'GET',
    path: '/api/v1/players/{id}/activities/newcomer-login',
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
  post_players_id_activities_newcomer_login_claim: {
    method: 'POST',
    path: '/api/v1/players/{id}/activities/newcomer-login/claim',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false },
      { name: 'X-Request-ID', required: false, style: 'simple', explode: false }
    ]
  },
  post_players_id_activities_newcomer_login_tasks_taskId_claim: {
    method: 'POST',
    path: '/api/v1/players/{id}/activities/newcomer-login/tasks/{taskId}/claim',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [
      { schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false },
      { schema: { type: 'integer', minimum: 1 }, name: 'taskId', required: true, style: 'simple', explode: false }
    ],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false },
      { name: 'X-Request-ID', required: false, style: 'simple', explode: false }
    ]
  },
  get_players_id_recharge_catalog: {
    method: 'GET',
    path: '/api/v1/players/{id}/recharge/catalog',
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
  get_players_id_recharge_normal_packages: {
    method: 'GET',
    path: '/api/v1/players/{id}/recharge/normal-packages',
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
  get_players_id_recharge_rights: {
    method: 'GET',
    path: '/api/v1/players/{id}/recharge/rights',
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
  get_players_id_limited_events_tokens: {
    method: 'GET',
    path: '/api/v1/players/{id}/limited-events/tokens',
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
  get_players_id_vip_privileges: {
    method: 'GET',
    path: '/api/v1/players/{id}/vip/privileges',
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
  get_players_id_limited_events_recharge_tiers: {
    method: 'GET',
    path: '/api/v1/players/{id}/limited-events/recharge-tiers',
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
  post_players_id_limited_events_recharge_tiers_subActivityId_claim: {
    method: 'POST',
    path: '/api/v1/players/{id}/limited-events/recharge-tiers/{subActivityId}/claim',
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
        name: 'subActivityId',
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
  get_players_id_limited_events_recharge_packages: {
    method: 'GET',
    path: '/api/v1/players/{id}/limited-events/recharge-packages',
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
  get_players_id_recharge_overview: {
    method: 'GET',
    path: '/api/v1/players/{id}/recharge/overview',
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
  get_players_id_recharge_first: {
    method: 'GET',
    path: '/api/v1/players/{id}/recharge/first',
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
  post_players_id_recharge_first_tiers_tierAmount_claim: {
    method: 'POST',
    path: '/api/v1/players/{id}/recharge/first/tiers/{tierAmount}/claim',
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
  get_players_id_recharge_weekly_rebate: {
    method: 'GET',
    path: '/api/v1/players/{id}/recharge/weekly-rebate',
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
  post_players_id_recharge_weekly_rebate_dayIndex_claim: {
    method: 'POST',
    path: '/api/v1/players/{id}/recharge/weekly-rebate/{dayIndex}/claim',
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
          minimum: 1,
          maximum: 648
        },
        name: 'dayIndex',
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
      },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_recharge_weekly_rebate_loop_claim: {
    method: 'POST',
    path: '/api/v1/players/{id}/recharge/weekly-rebate/loop/claim',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: 'application/json',
    bodyRequired: true,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: [
      { name: 'Idempotency-Key', required: true, style: 'simple', explode: false },
      { name: 'X-Request-ID', required: false, style: 'simple', explode: false }
    ]
  },
  post_players_id_recharge_newcomer_claim: {
    method: 'POST',
    path: '/api/v1/players/{id}/recharge/newcomer/claim',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: 'application/json',
    bodyRequired: true,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false },
      { name: 'X-Request-ID', required: false, style: 'simple', explode: false }
    ]
  },
  get_players_id_recharge_newcomer: {
    method: 'GET',
    path: '/api/v1/players/{id}/recharge/newcomer',
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
  get_players_id_recharge_vip: {
    method: 'GET',
    path: '/api/v1/players/{id}/recharge/vip',
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
  get_players_id_recharge_double: {
    method: 'GET',
    path: '/api/v1/players/{id}/recharge/double',
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
  get_players_id_recharge_month_card: {
    method: 'GET',
    path: '/api/v1/players/{id}/recharge/month-card',
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
  get_players_id_recharge_month_card_daily_rewards: {
    method: 'GET',
    path: '/api/v1/players/{id}/recharge/month-card/daily-rewards',
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
  post_players_id_recharge_month_card_daily_rewards_claim_all: {
    method: 'POST',
    path: '/api/v1/players/{id}/recharge/month-card/daily-rewards/claim-all',
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
  get_players_id_recharge_world_milestones: {
    method: 'GET',
    path: '/api/v1/players/{id}/recharge/world-milestones',
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
  post_players_id_recharge_world_milestones_order_claim: {
    method: 'POST',
    path: '/api/v1/players/{id}/recharge/world-milestones/{order}/claim',
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
        name: 'order',
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
  post_players_id_recharge_world_milestones_claim_all: {
    method: 'POST',
    path: '/api/v1/players/{id}/recharge/world-milestones/claim-all',
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
  }
} as const;
