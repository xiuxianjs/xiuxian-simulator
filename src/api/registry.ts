// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.

import { accountOperationDefinitions } from './domains/account/operations.js';
import type { AccountOperations } from './domains/account/types.js';
import { authOperationDefinitions } from './domains/auth/operations.js';
import type { AuthOperations } from './domains/auth/types.js';
import { battleOperationDefinitions } from './domains/battle/operations.js';
import type { BattleOperations } from './domains/battle/types.js';
import { benefitsOperationDefinitions } from './domains/benefits/operations.js';
import type { BenefitsOperations } from './domains/benefits/types.js';
import { communityOperationDefinitions } from './domains/community/operations.js';
import type { CommunityOperations } from './domains/community/types.js';
import { crossPlatformOperationDefinitions } from './domains/cross-platform/operations.js';
import type { CrossPlatformOperations } from './domains/cross-platform/types.js';
import { cultivationOperationDefinitions } from './domains/cultivation/operations.js';
import type { CultivationOperations } from './domains/cultivation/types.js';
import { dungeonsOperationDefinitions } from './domains/dungeons/operations.js';
import type { DungeonsOperations } from './domains/dungeons/types.js';
import { equipmentOperationDefinitions } from './domains/equipment/operations.js';
import type { EquipmentOperations } from './domains/equipment/types.js';
import { housingOperationDefinitions } from './domains/housing/operations.js';
import type { HousingOperations } from './domains/housing/types.js';
import { internalOperationDefinitions } from './domains/internal/operations.js';
import type { InternalOperations } from './domains/internal/types.js';
import { inventoryOperationDefinitions } from './domains/inventory/operations.js';
import type { InventoryOperations } from './domains/inventory/types.js';
import { mailOperationDefinitions } from './domains/mail/operations.js';
import type { MailOperations } from './domains/mail/types.js';
import { marketOperationDefinitions } from './domains/market/operations.js';
import type { MarketOperations } from './domains/market/types.js';
import { mentorshipOperationDefinitions } from './domains/mentorship/operations.js';
import type { MentorshipOperations } from './domains/mentorship/types.js';
import { notificationsOperationDefinitions } from './domains/notifications/operations.js';
import type { NotificationsOperations } from './domains/notifications/types.js';
import { partnersOperationDefinitions } from './domains/partners/operations.js';
import type { PartnersOperations } from './domains/partners/types.js';
import { paymentsOperationDefinitions } from './domains/payments/operations.js';
import type { PaymentsOperations } from './domains/payments/types.js';
import { playersOperationDefinitions } from './domains/players/operations.js';
import type { PlayersOperations } from './domains/players/types.js';
import { professionsOperationDefinitions } from './domains/professions/operations.js';
import type { ProfessionsOperations } from './domains/professions/types.js';
import { rankingsOperationDefinitions } from './domains/rankings/operations.js';
import type { RankingsOperations } from './domains/rankings/types.js';
import { rewardsOperationDefinitions } from './domains/rewards/operations.js';
import type { RewardsOperations } from './domains/rewards/types.js';
import { sectCompetitionOperationDefinitions } from './domains/sect-competition/operations.js';
import type { SectCompetitionOperations } from './domains/sect-competition/types.js';
import { sectRealmsOperationDefinitions } from './domains/sect-realms/operations.js';
import type { SectRealmsOperations } from './domains/sect-realms/types.js';
import { sectsOperationDefinitions } from './domains/sects/operations.js';
import type { SectsOperations } from './domains/sects/types.js';
import { socialOperationDefinitions } from './domains/social/operations.js';
import type { SocialOperations } from './domains/social/types.js';
import { statusOperationDefinitions } from './domains/status/operations.js';
import type { StatusOperations } from './domains/status/types.js';
import { teamsOperationDefinitions } from './domains/teams/operations.js';
import type { TeamsOperations } from './domains/teams/types.js';

export const securitySchemes = {
  RobotBearer: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'opaque',
    description: '机器人授权 token；由部署环境的 ROBOT_AUTH_TOKEN 提供'
  },
  RobotBid: {
    type: 'apiKey',
    in: 'header',
    name: 'X-Bid'
  },
  UserBearer: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: '角色 UID 绑定的短期普通用户访问令牌'
  },
  WorkerToken: {
    type: 'apiKey',
    in: 'header',
    name: 'X-Worker-Token'
  }
} as const;

export const operationDefinitions = {
  ...accountOperationDefinitions,
  ...authOperationDefinitions,
  ...battleOperationDefinitions,
  ...benefitsOperationDefinitions,
  ...communityOperationDefinitions,
  ...crossPlatformOperationDefinitions,
  ...cultivationOperationDefinitions,
  ...dungeonsOperationDefinitions,
  ...equipmentOperationDefinitions,
  ...housingOperationDefinitions,
  ...internalOperationDefinitions,
  ...inventoryOperationDefinitions,
  ...mailOperationDefinitions,
  ...marketOperationDefinitions,
  ...mentorshipOperationDefinitions,
  ...notificationsOperationDefinitions,
  ...partnersOperationDefinitions,
  ...paymentsOperationDefinitions,
  ...playersOperationDefinitions,
  ...professionsOperationDefinitions,
  ...rankingsOperationDefinitions,
  ...rewardsOperationDefinitions,
  ...sectCompetitionOperationDefinitions,
  ...sectRealmsOperationDefinitions,
  ...sectsOperationDefinitions,
  ...socialOperationDefinitions,
  ...statusOperationDefinitions,
  ...teamsOperationDefinitions
} as const;

export type Operations = AccountOperations &
  AuthOperations &
  BattleOperations &
  BenefitsOperations &
  CommunityOperations &
  CrossPlatformOperations &
  CultivationOperations &
  DungeonsOperations &
  EquipmentOperations &
  HousingOperations &
  InternalOperations &
  InventoryOperations &
  MailOperations &
  MarketOperations &
  MentorshipOperations &
  NotificationsOperations &
  PartnersOperations &
  PaymentsOperations &
  PlayersOperations &
  ProfessionsOperations &
  RankingsOperations &
  RewardsOperations &
  SectCompetitionOperations &
  SectRealmsOperations &
  SectsOperations &
  SocialOperations &
  StatusOperations &
  TeamsOperations;
export type OperationId = keyof Operations;
