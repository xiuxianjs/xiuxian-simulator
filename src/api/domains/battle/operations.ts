// HTTP metadata aligned with Go docs/openapi.yaml; keep DTOs separately reviewed and verify with yarn test:contracts.
export const battleOperationDefinitions = {
  get_battle_memory_by_id: {
    method: 'GET',
    path: '/api/v1/battle-memories/{id}',
    security: [],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ name: 'id', required: true, style: 'simple', explode: false, schema: { type: 'string' } }],
    queryParams: [],
    headerParams: []
  },
  post_players_id_battle_log_query: {
    method: 'POST',
    path: '/api/v1/players/{id}/battle-log-query',
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
        name: 'id',
        required: true,
        style: 'simple',
        explode: false,
        schema: {
          type: 'integer',
          minimum: 1
        }
      }
    ],
    queryParams: [],
    headerParams: [
      {
        name: 'X-Repeat-Command',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_robbery_records_view: {
    method: 'POST',
    path: '/api/v1/players/{id}/robbery/records-view',
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
  get_battle_logs: {
    method: 'GET',
    path: '/api/v1/battle-logs',
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
    queryParams: [
      {
        schema: {
          type: 'string'
        },
        name: 'logId',
        required: true,
        style: 'form',
        explode: true
      }
    ],
    headerParams: []
  },
  get_players_id_kill_god_ranking: {
    method: 'GET',
    path: '/api/v1/players/{id}/kill-god-ranking',
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
  post_players_id_kill_god_title_claim: {
    method: 'POST',
    path: '/api/v1/players/{id}/kill-god-title/claim',
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
      { name: 'Idempotency-Key', required: true, style: 'simple', explode: false },
      { name: 'X-Request-ID', required: false, style: 'simple', explode: false }
    ]
  },
  get_players_id_sha_qi: {
    method: 'GET',
    path: '/api/v1/players/{id}/sha-qi',
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
  get_players_id_alchemy_leaderboard: {
    method: 'GET',
    path: '/api/v1/players/{id}/alchemy/leaderboard',
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
    headerParams: []
  },
  get_players_id_robbery_enemies: {
    method: 'GET',
    path: '/api/v1/players/{id}/robbery/enemies',
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
  get_alchemy_leaderboard: {
    method: 'GET',
    path: '/api/v1/alchemy/leaderboard',
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
    queryParams: [
      {
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100
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
  post_spar_playerId_targetId: {
    method: 'POST',
    path: '/api/v1/spar/{playerId}/{targetId}',
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
        name: 'playerId',
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
  post_robbery_playerId_targetId: {
    method: 'POST',
    path: '/api/v1/robbery/{playerId}/{targetId}',
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
        name: 'playerId',
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
  get_robbery_records_playerId: {
    method: 'GET',
    path: '/api/v1/robbery-records/{playerId}',
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
        name: 'playerId',
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
    headerParams: [
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  post_players_id_robbery_notifications_read: {
    method: 'POST',
    path: '/api/v1/players/{id}/robbery-notifications/read',
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
  get_leaderboards_popularity: {
    method: 'GET',
    path: '/api/v1/leaderboards/popularity',
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
    queryParams: [
      {
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100
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
  post_players_id_popularity_likes: {
    method: 'POST',
    path: '/api/v1/players/{id}/popularity-likes',
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
  get_players_id_tianjiao: {
    method: 'GET',
    path: '/api/v1/players/{id}/tianjiao',
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
  get_players_id_tianjiao_access: {
    method: 'GET',
    path: '/api/v1/players/{id}/tianjiao/access',
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
  get_players_id_tianjiao_rewards: {
    method: 'GET',
    path: '/api/v1/players/{id}/tianjiao/rewards',
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
  post_players_id_tianjiao_challenges: {
    method: 'POST',
    path: '/api/v1/players/{id}/tianjiao/challenges',
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
  post_counter_attacks_playerId_robberyLogId: {
    method: 'POST',
    path: '/api/v1/counter-attacks/{playerId}/{robberyLogId}',
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
        name: 'playerId',
        required: true,
        style: 'simple',
        explode: false
      },
      {
        schema: {
          type: 'integer',
          minimum: 1
        },
        name: 'robberyLogId',
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
