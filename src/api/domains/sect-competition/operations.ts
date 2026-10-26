// HTTP metadata aligned with Go docs/openapi.yaml; keep DTOs separately reviewed and verify with yarn test:contracts.
export const sectCompetitionOperationDefinitions = {
  get_players_id_guild_competition_team_candidates: {
    method: 'GET',
    path: '/api/v1/players/{id}/guild-competition/team/candidates',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'page', required: false, style: 'form', explode: true }],
    headerParams: []
  },
  get_guild_competitions_current_month_bets_mine: {
    method: 'GET',
    path: '/api/v1/guild-competitions/current-month/bets/mine',
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
  get_players_id_guild_competition_battles: {
    method: 'GET',
    path: '/api/v1/players/{id}/guild-competition/battles',
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
  get_guild_competitions_current: {
    method: 'GET',
    path: '/api/v1/guild-competitions/current',
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
  get_guild_competitions_current_teams: {
    method: 'GET',
    path: '/api/v1/guild-competitions/current/teams',
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
  get_guild_competitions_current_battles: {
    method: 'GET',
    path: '/api/v1/guild-competitions/current/battles',
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
  get_guild_competitions_current_bets_mine: {
    method: 'GET',
    path: '/api/v1/guild-competitions/current/bets/mine',
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
  get_guild_competitions_current_rewards_mine: {
    method: 'GET',
    path: '/api/v1/guild-competitions/current/rewards/mine',
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
  post_guild_competitions_current_rewards_claim: {
    method: 'POST',
    path: '/api/v1/guild-competitions/current/rewards/claim',
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
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      {
        name: 'Idempotency-Key',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },

  post_players_id_guild_competition_apply: {
    method: 'POST',
    path: '/api/v1/players/{id}/guild-competition/apply',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false }
    ]
  },
  post_players_id_guild_competition_team_members: {
    method: 'POST',
    path: '/api/v1/players/{id}/guild-competition/team/members',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: 'application/json',
    bodyRequired: true,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: [{ name: 'Idempotency-Key', required: false, style: 'simple', explode: false }]
  },
  delete_players_id_guild_competition_team_members_position: {
    method: 'DELETE',
    path: '/api/v1/players/{id}/guild-competition/team/members/{position}',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [
      { schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false },
      { schema: { type: 'integer', minimum: 1, maximum: 6 }, name: 'position', required: true, style: 'simple', explode: false }
    ],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false }
    ]
  },
  post_players_id_guild_competition_team_position: {
    method: 'POST',
    path: '/api/v1/players/{id}/guild-competition/team/position',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: 'application/json',
    bodyRequired: true,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false }
    ]
  },
  delete_players_id_guild_competition_team: {
    method: 'DELETE',
    path: '/api/v1/players/{id}/guild-competition/team',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false }
    ]
  },
  post_players_id_guild_competition_bets: {
    method: 'POST',
    path: '/api/v1/players/{id}/guild-competition/bets',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: 'application/json',
    bodyRequired: true,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false }
    ]
  },
  get_players_id_guild_competition_knockout_candidates: {
    method: 'GET',
    path: '/api/v1/players/{id}/guild-competition/knockout/candidates',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: []
  },
  post_players_id_guild_competition_knockout_challenges: {
    method: 'POST',
    path: '/api/v1/players/{id}/guild-competition/knockout/challenges',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: 'application/json',
    bodyRequired: true,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false }
    ]
  },
  get_guild_competitions_current_promotion_teams: {
    method: 'GET',
    path: '/api/v1/guild-competitions/current/promotion-teams',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [],
    queryParams: [],
    headerParams: []
  },
  get_players_id_guild_competition_home: {
    method: 'GET',
    path: '/api/v1/players/{id}/guild-competition/home',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: []
  },
  get_players_id_guild_competition_battles_battle_id: {
    method: 'GET',
    path: '/api/v1/players/{id}/guild-competition/battles/{battleId}',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: null,
    bodyRequired: false,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [
      { schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false },
      { schema: { type: 'integer', minimum: 1 }, name: 'battleId', required: true, style: 'simple', explode: false }
    ],
    queryParams: [],
    headerParams: []
  },
  post_players_id_guild_competition_bets_follow: {
    method: 'POST',
    path: '/api/v1/players/{id}/guild-competition/bets/follow',
    security: [{ RobotBearer: [], RobotBid: [] }, { UserBearer: [] }],
    requestContentType: 'application/json',
    bodyRequired: true,
    responseKind: 'json',
    responseEnvelope: true,
    pathParams: [{ schema: { type: 'integer', minimum: 1 }, name: 'id', required: true, style: 'simple', explode: false }],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false }
    ]
  }
} as const;
