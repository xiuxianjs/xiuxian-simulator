import type { LootboxTreasureSelection } from './lootbox-selection';

/** Read contracts matched to current Go query services, without UI commands. */
export interface SocialAccessData {
  canUseSecondLayerFeature: boolean;
  realmNameValue: string | null;
  realmName: string;
  canUseFifthLayerFeature: boolean;
  canUseSpar: boolean;
  canCreateOrApplyGuild: boolean;
}
export interface FriendListData {
  total: number;
  currentPage: number;
  pageSize: number;
  maxFriends: number;
  myGender: number;
  hasCompanion: boolean;
  list: Array<{
    friendId: number;
    friendName: string;
    userExists: boolean;
    gender: number | null;
    hasCompanion: boolean;
    realmId: number;
    realmName: string;
    relationType: number;
    relationText: string;
    intimacy: number;
    spiritBondLevel: string;
    canProposeCompanion: boolean;
    remark?: string;
  }>;
}
export interface GuildListData {
  total: number;
  currentPage: number;
  totalPages: number;
  guilds: Array<{
    id: number;
    name: string;
    intro: string | null;
    memberCount: number;
    levelId: number;
    level: number | null;
    minRealmName: string | null;
    titles: string[];
  }>;
}
export interface GiftRecordPageData {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  list: Array<{
    id: number;
    senderUid: number;
    receiverUid: number;
    senderName: string | null;
    receiverName: string | null;
    giftName: string;
    quantity: number;
    relationType: number;
    relationText: string;
    isPremium: number;
    premium: boolean;
    intimacyGained: number;
    tongxinGained: number;
    createdAt: string;
  }>;
}
export interface AchievementPageData {
  items: Array<{
    id: number;
    name: string | null;
    description: string | null;
    completedAt?: string | null;
  }>;
  page: {
    total: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface MemoryData {
  name: string;
  realmStageLevel: number;
  canShowStoryButton: boolean;
  totalDays: number;
  items: Array<{ label: string; text: string; subtext?: string }>;
  createdAt: string;
  asOf: string;
  first: Record<
    'checkIn' | 'stage' | 'dungeon' | 'seclusion' | 'friend' | 'purchase' | 'equipment',
    {
      occurredAt: string;
      stars: number;
      settledHours: number;
    } | null
  >;
}
export interface StoryData {
  name: string;
  realmStageLevel: number;
  canShowMemoryButton: boolean;
  items: Array<{ label: string; value: string; flavor: string }>;
  stats: {
    checkInCount: number;
    stageCount: number;
    dungeonCount: number;
    seclusionCount: number;
    seclusionHours: number;
    friendCount: number;
    attackWinCount: number;
    attackLoseCount: number;
    itemCount: number;
    equipCount: number;
    purchaseCount: number;
    gachaCount: number;
    achievementCount: number;
  };
}
export interface EmailData {
  id: number;
  name: string;
  subtitle: string;
  data: string;
  time: string;
  state: number;
  canClaim: boolean;
  canDelete: boolean;
  /** Persisted attachment facts; validate per category before use. */
  goods: Array<Record<string, unknown>>;
}
/** Normalized attachment fields consumed by the robot's mail-list display. */
export interface EmailDisplayGood {
  itemId: number;
  name: string;
  category: string;
  quantity: number;
}
export interface EmailPageData {
  total: number;
  page: number;
  pageSize: number;
  list: EmailData[];
  hasClaimable: boolean;
  hasDeletable: boolean;
}

export interface TeamListData {
  items: Array<{
    id: number;
    leaderId: number;
    leaderName: string | null;
    memberCount: number;
    maxMembers: number;
    minRealmId?: number;
    minRealmName: string | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

export interface PlayerGuildLogsData {
  hasGuild: boolean;
  guildName: string;
  logs: Array<{ id: number; content: string; formattedTime: string }>;
  total: number;
  page: number;
  totalPages: number;
}

export interface MasterRankingStats {
  virtueExperience: number;
  virtueLevel: number;
  virtueTitle: string;
  activeDiscipleCount: number;
  totalGraduatedCount: number;
}
export interface MasterRankingData {
  top: Array<MasterRankingStats & { rank: number; userId: number; userName: string | null }>;
  nearby: MasterRankingData['top'];
  self: (MasterRankingStats & { rank: number }) | null;
}

export interface GachaRealmData {
  id: number;
  name: string;
  level: number;
  stageLevel: number;
}
export interface GachaCatalogData {
  active: boolean;
  accessStatus: 'NO_BANNER' | 'REALM_LOW' | 'READY';
  bannerId: number;
  minRealm: GachaRealmData | null;
  userRealm: GachaRealmData | null;
  pools: Array<{ id: number; poolName: string; realm: GachaRealmData | null; merchantTitle: string }>;
}
export interface GachaHistoryData {
  id: number;
  tierName: string;
  item: Record<string, unknown> | null;
  itemSnapshotJson: string;
  isFree: boolean;
  createdAt: string;
}

export interface GachaGoodsTierData {
  tierName: string;
  tierLabel: string;
  tierWeight: number;
  probabilityPercent: number;
  pityLimit: number | null;
  items: Array<{
    itemName: string;
    itemType: string;
    itemTypeLabel: string;
    displayName: string;
    canViewDetail: boolean;
    quantity: number;
    isUp: boolean;
    probability: number;
    actualRatePercent: number;
  }>;
}

export interface CurrencyCardData {
  spiritStone: number;
  spiritsCrystal: number;
  spiritsMilk: number;
  signInCoin: number;
  towerScore: number;
  reputation: number;
  tongxin: number;
  greenBottle: number;
}
export interface GachaOverviewData {
  banner: null | {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    pools: Array<{
      id: number;
      poolName: string;
      poolLevel: number;
      currencyCode: string;
      currencyName: string;
      pricePerPull: number;
      tenPullCost: number;
      maxUpPerUser: number;
      realm: GachaRealmData | null;
      merchantTitle: string;
      tiers: Array<{ tierName: string; tierLabel: string; weight: number; probabilityPercent: number; pityLimit: number | null }>;
      upItems: Array<{ itemName: string; tierName: string }>;
      pity: { tierPity: Record<string, number>; freeRemaining: number; upObtained: number };
      mainPityRemaining: number | null;
      subPityRemaining: number | null;
      upLimitReached: boolean;
    }>;
  };
  minRealm?: GachaRealmData | null;
  accessStatus?: 'REALM_LOW' | 'READY';
  userRealm?: GachaRealmData | null;
  currencies?: CurrencyCardData;
}

export interface LootboxOpenOption {
  /** Server-authorized request value; the robot must forward it unchanged. */
  requestedCount: number;
  /** Actual count the server will settle for this player at query time. */
  effectiveCount: number;
}

export interface LootboxCapability {
  kind: 'open';
  valid: boolean;
  options: LootboxOpenOption[];
}

export interface LootboxListItem {
  id: number;
  lootboxId: number;
  quantity: number;
  name: string | null;
  description: string | null;
  capabilities: LootboxCapability[];
  selection?: LootboxTreasureSelection;
}

export interface LootboxListData {
  items: LootboxListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SoulArtifactBagData {
  items: {
    id: number;
    artifactId: number;
    gradeId: number;
    name: string | null;
    gradeName: string | null;
    level: number;
    washCount: number;
    hasUpgraded: number;
    isEquipped: number;
    isLocked: number;
    canRefine: boolean;
    canToggleLock: boolean;
    lockAction: 'lock' | 'unlock' | '';
  }[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TeamBattleRecordsData {
  items: {
    id: number;
    teamId: number;
    leaderUserId: number;
    battleMode: string;
    targetLabel: string;
    battleResult: string;
    participantCount: number;
    battleLogId: string | null;
    settledAt: string | null;
  }[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TeamBattleDetailData extends TeamBattleRecordsDataItem {
  members: {
    userId: number;
    userName: string;
    isLeader: boolean;
    position: number;
    rewardSnapshot?: Record<string, unknown> | null;
  }[];
}
type TeamBattleRecordsDataItem = TeamBattleRecordsData['items'][number];

export interface TeamPendingData {
  teamId: number;
  leaderName: string | null;
  applications: { id: number; teamId: number; userId: number; status: number; createdAt: string; userName: string | null }[];
}

export interface TeamApplicationRecordsData {
  isLeader: boolean;
  realmName: string;
  canUseSecondLayerFeature: boolean;
  applications: { id: number; teamId: number; userId: number; status: number; createdAt: string | null; leaderName: string | null }[];
}

export interface ProfessionToolBagData {
  types: string[];
  items: {
    id: number;
    toolId: number;
    name: string | null;
    typeName: string | null;
    gradeId: number | null;
    gradeName: string | null;
    isEquipped: number;
    isLocked: number;
    canReplace: boolean;
    canToggleLock: boolean;
    displayName: string;
    displayGrade: string;
    capabilities: Array<'replace' | 'lock' | 'unlock' | 'viewDetail'>;
  }[];
  activeType: string | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  capabilities: Array<'lockAll' | 'unlockAll'>;
}

export interface SkillBookBagItemData {
  id: number;
  skillBookId: number;
  status: number;
  isLocked: number;
  physicalAttack: number;
  magicAttack: number;
  physicalDefense: number;
  magicDefense: number;
  hp: number;
  physicalAttackPercent: number;
  magicAttackPercent: number;
  physicalDefensePercent: number;
  magicDefensePercent: number;
  hpPercent: number;
  speed: number;
  critRate: number;
  critDamage: number;
  maxPhysicalAttack: number;
  maxMagicAttack: number;
  maxPhysicalDefense: number;
  maxMagicDefense: number;
  maxHp: number;
  maxPhysicalAttackPercent: number;
  maxMagicAttackPercent: number;
  maxPhysicalDefensePercent: number;
  maxMagicDefensePercent: number;
  maxHpPercent: number;
  maxSpeed: number;
  maxCritRate: number;
  maxCritDamage: number;
  name: string | null;
  gradeId: number | null;
  grade: string | null;
  realm: string | null;
  skillType: string | null;
}

/** A server-authorized skill-book entry point. The robot only maps it to its command vocabulary. */
export interface SkillBookBagCapability {
  kind: 'lock' | 'unlock' | 'learn' | 'decompose' | 'viewDetail' | 'lockAll' | 'unlockAll' | 'decomposeAll';
  /** Legacy response field retained for compatibility; no identification action is exposed. */
  count?: number;
  /** Supplied by the server for type-scoped bulk operations. */
  skillType?: string;
}

export interface SkillBookStoragePageData {
  skillType: string;
  page: number;
  total: number;
  totalPages: number;
  items: Array<
    SkillBookBagItemData & {
      quantity: number;
      identifiableCount: number;
      capabilities: SkillBookBagCapability[];
      displayName: string;
      displayGrade: string;
      displaySkillType: string;
      unidentified: boolean;
      attributeParts: string[];
    }
  >;
  capabilities: SkillBookBagCapability[];
}

export type EquipmentBagCapabilityKind = 'equip' | 'lock' | 'unlock' | 'decompose' | 'viewDetail' | 'lockAll' | 'unlockAll' | 'decomposeAll';

/** A server-authorized equipment entry point. The robot maps it to a platform command. */
export interface EquipmentBagCapability {
  kind: EquipmentBagCapabilityKind;
  equipmentType?: string;
}

export interface EquipmentBagItemData {
  id: number;
  equipmentId: number;
  isEquipped: number;
  isLocked: number;
  name: string | null;
  equipmentType: string | null;
  grade: string | null;
  physicalAttack: number;
  magicAttack: number;
  physicalDefense: number;
  magicDefense: number;
  hp: number;
  physicalAttackPercent: number;
  magicAttackPercent: number;
  physicalDefensePercent: number;
  magicDefensePercent: number;
  hpPercent: number;
  speed: number;
  critRate: number;
  critDamage: number;
  canEquip: boolean;
  canLock: boolean;
  canDecompose: boolean;
  capabilities: EquipmentBagCapability[];
  displayName: string;
  displayEquipmentType: string;
  displayGrade: string;
  attributeParts: string[];
}

export interface EquipmentBagData {
  types: string[];
  activeType: string | null;
  page: number;
  total: number;
  totalPages: number;
  items: EquipmentBagItemData[];
  capabilities: EquipmentBagCapability[];
}

export interface MarketTradeRecordsData {
  items: {
    id: number;
    listingId: number;
    role: 'buy' | 'sell';
    sellerUserId: number;
    sellerName: string;
    sellerExists: boolean;
    itemCategory: string;
    itemName: string;
    quantity: number;
    unitPriceAmount: number;
    totalPriceAmount: number;
    currencyCode: string;
    currencyName: string;
    displayQuantity: number;
    displayUnitPrice: number;
    displayTotalPrice: number;
    displayFee: number;
    displaySellerReceive: number;
    feeAmount: number;
    sellerReceivedAmount: number;
    createdAt: string;
  }[];
  total: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface DungeonDetailData {
  id: number;
  name: string;
  isSingle: boolean;
  typeLabel: string;
  realmLimit: string;
  spiritCost: number;
  guildContributionCost: number;
  minPlayers: number;
  usedToday: number;
  dailyLimit: number;
  freeUsed: number;
  freeLimit: number;
  expReward: number;
  currencyDrops: { code: string; name: string; amount: number }[];
  skillDrops: { category: string; itemId: number; name: string; amount: number; probability: number }[];
  materialDrops: { category: string; itemId: number; name: string; amount: number; probability: number }[];
  hasCleared: boolean;
  firstClearReward: { parts: string[] } | null;
  outputMultiplier: number | null;
  outputAddPct: number | null;
  inTeam: boolean;
}

export interface DungeonCatalogData {
  items: { id: number; name: string; isSingle: boolean; hasCleared: boolean; spiritCost: number; minRealmName: string | null; maxRealmName: string | null }[];
  mentalValue: number;
  inTeam: boolean;
  realmLevel: number;
  realmStageLevel: number;
  canUseMeridian: boolean;
  canMatchDungeon: boolean;
  currentPage: number;
  totalPages: number;
  total: number;
}

export interface GuildStorylineRecordsData {
  guildName: string;
  guildLevel: number;
  records: { stageIndex: number; damageDealt: number; participationPoint: number; battleResult: number; isEffective: boolean; attemptNo: number }[];
}

export interface FeedbackQueryItem {
  id: number;
  content: string;
  isReplied: boolean;
  feedbackTime: string;
}
export interface FeedbackQueryPage {
  items: FeedbackQueryItem[];
  total: number;
  page: number;
  pageSize: number;
}
export interface FeedbackQueryCursor {
  items: FeedbackQueryItem[];
  nextCursor?: string;
}
export interface FeedbackQueryDetail extends FeedbackQueryItem {
  reply: string | null;
  categoryName: string | null;
}

export interface RobberyEnemyData {
  uid: number;
  name: string | null;
  totalAttacks: number;
  lastAttackTime: string;
  lastLogId: number;
}

export interface PlayerGuildMembersData {
  membershipStatus: 'not_joined' | 'guild_missing' | 'members_missing' | 'joined';
  guildName: string;
  members: {
    userId: number;
    roleId: number;
    name: string | null;
    realmName: string | null;
    roleName: string | null;
    dailyActivity: number;
    weeklyActivity: number;
    contributionTotal: number;
    isOnLeave: boolean;
    leaveEndAt: string | null;
    isDeputy: boolean;
  }[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
