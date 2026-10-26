// HTTP metadata aligned with Go docs/openapi.yaml; keep DTOs separately reviewed and verify with yarn test:contracts.
export const teamsOperationDefinitions = {
  post_players_id_team_workflow: {
    method: 'POST',
    path: '/api/v1/players/{id}/team/workflow',
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
  patch_players_id_team_min_realm: {
    method: 'PATCH',
    path: '/api/v1/players/{id}/team/min-realm',
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
      }
    ]
  },
  get_teams_match_snapshot: {
    method: 'GET',
    path: '/api/v1/teams/match/snapshot',
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
  post_teams_match_command_guard: {
    method: 'POST',
    path: '/api/v1/teams/match/command-guard',
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
    pathParams: [],
    queryParams: [],
    headerParams: []
  },
  get_players_id_team_overview: {
    method: 'GET',
    path: '/api/v1/players/{id}/team/overview',
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
  get_players_id_team_application_records: {
    method: 'GET',
    path: '/api/v1/players/{id}/team/application-records',
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
  get_players_id_team_pending_applications: {
    method: 'GET',
    path: '/api/v1/players/{id}/team/pending-applications',
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
  get_teams_battle_records: {
    method: 'GET',
    path: '/api/v1/teams/battle-records',
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
  get_teams_battle_records_recordId: {
    method: 'GET',
    path: '/api/v1/teams/battle-records/{recordId}',
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
        name: 'recordId',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [],
    headerParams: []
  },
  get_teams: {
    method: 'GET',
    path: '/api/v1/teams',
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
  post_teams: {
    method: 'POST',
    path: '/api/v1/teams',
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
      },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  get_teams_teamId: {
    method: 'GET',
    path: '/api/v1/teams/{teamId}',
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
        name: 'teamId',
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
  get_teams_mine: {
    method: 'GET',
    path: '/api/v1/teams/mine',
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
  delete_teams_mine: {
    method: 'DELETE',
    path: '/api/v1/teams/mine',
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
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false },
      { name: 'X-Request-ID', required: false, style: 'simple', explode: false }
    ]
  },
  delete_teams_members_memberId: {
    method: 'DELETE',
    path: '/api/v1/teams/members/{memberId}',
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
        name: 'memberId',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false },
      { name: 'X-Request-ID', required: false, style: 'simple', explode: false }
    ]
  },
  patch_teams_members_memberId_position: {
    method: 'PATCH',
    path: '/api/v1/teams/members/{memberId}/position',
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
          type: 'string'
        },
        name: 'memberId',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [],
    headerParams: []
  },
  get_teams_position_target: {
    method: 'GET',
    path: '/api/v1/teams/position-target',
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
        name: 'targetBid',
        required: true,
        style: 'form',
        explode: true
      }
    ],
    headerParams: []
  },
  post_teams_leadership_transfer: {
    method: 'POST',
    path: '/api/v1/teams/leadership/transfer',
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
    pathParams: [],
    queryParams: [],
    headerParams: []
  },
  post_teams_teamId_join: {
    method: 'POST',
    path: '/api/v1/teams/{teamId}/join',
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
        name: 'teamId',
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
  get_teams_teamId_applications: {
    method: 'GET',
    path: '/api/v1/teams/{teamId}/applications',
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
        name: 'teamId',
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
  post_teams_teamId_applications: {
    method: 'POST',
    path: '/api/v1/teams/{teamId}/applications',
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
        name: 'teamId',
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
  get_teams_applications: {
    method: 'GET',
    path: '/api/v1/teams/applications',
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
  get_teams_invitations: {
    method: 'GET',
    path: '/api/v1/teams/invitations',
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
  post_players_id_team_invitations_refresh: {
    method: 'POST',
    path: '/api/v1/players/{id}/team/invitations/refresh',
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
  post_teams_invitations: {
    method: 'POST',
    path: '/api/v1/teams/invitations',
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
    pathParams: [],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false },
      { name: 'X-Request-ID', required: false, style: 'simple', explode: false }
    ]
  },
  post_teams_invitations_invitationId_accept: {
    method: 'POST',
    path: '/api/v1/teams/invitations/{invitationId}/accept',
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
        name: 'invitationId',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false },
      { name: 'X-Request-ID', required: false, style: 'simple', explode: false }
    ]
  },
  delete_teams_invitations_invitationId: {
    method: 'DELETE',
    path: '/api/v1/teams/invitations/{invitationId}',
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
          type: 'string'
        },
        name: 'invitationId',
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
      }
    ]
  },
  post_teams_invitations_invitationId_reject: {
    method: 'POST',
    path: '/api/v1/teams/invitations/{invitationId}/reject',
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
        name: 'invitationId',
        required: true,
        style: 'simple',
        explode: false
      }
    ],
    queryParams: [],
    headerParams: [
      { name: 'X-Repeat-Command', required: false, style: 'simple', explode: false },
      { name: 'Idempotency-Key', required: false, style: 'simple', explode: false },
      { name: 'X-Request-ID', required: false, style: 'simple', explode: false }
    ]
  },
  delete_teams_applications_applicationId: {
    method: 'DELETE',
    path: '/api/v1/teams/applications/{applicationId}',
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
        name: 'applicationId',
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
      }
    ]
  },
  post_teams_applications_applicationId_approve: {
    method: 'POST',
    path: '/api/v1/teams/applications/{applicationId}/approve',
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
        name: 'applicationId',
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
      }
    ]
  },
  post_teams_applications_applicationId_reject: {
    method: 'POST',
    path: '/api/v1/teams/applications/{applicationId}/reject',
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
        name: 'applicationId',
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
      }
    ]
  },
  post_teams_leave: {
    method: 'POST',
    path: '/api/v1/teams/leave',
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
      },
      {
        name: 'X-Request-ID',
        required: false,
        style: 'simple',
        explode: false
      }
    ]
  },
  get_teams_match: {
    method: 'GET',
    path: '/api/v1/teams/match',
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
  post_teams_match: {
    method: 'POST',
    path: '/api/v1/teams/match',
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
    pathParams: [],
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
  post_teams_match_cancel: {
    method: 'POST',
    path: '/api/v1/teams/match/cancel',
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
  }
} as const;
