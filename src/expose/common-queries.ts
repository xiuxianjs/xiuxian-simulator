import { parseSpiritRoot, parseSpiritRootMaterials } from '../api/bot/spirit-root';
import { ExposeError } from 'alemonjs';
import { requestBackend } from '../api/bot/client';
import { validatePlayerProfile } from '../api/bot/player-profile-query';
import { parseTaskPanelView } from '../api/bot/task-panel-view';
import { parseGuildHome } from '../api/bot/guild-home-query';
import { parseWorldBossInfo } from '../api/bot/world-boss-info-queries';
import { decodeStorylineCatalog } from '../api/bot/storyline-catalog-queries';
import { parseBackendCaveOverview } from '../api/bot/cave-overview-queries';
import { parseMeridianView } from '../api/bot/meridian';
import { parseSoulPathState } from '../api/bot/soul-path';
import { parseBackendEquipped } from '../api/bot/equipped-queries';
import { parseBackendLearnedBooks } from '../api/bot/learned-books-queries';
import { parseBackendDungeonCatalog, parseBackendEmails } from '../api/bot/queries';
import { query } from './query';
import { text, number, integer, boolean, page, fields, list, object } from './schema';

const resource = object({ current: number, cap: integer, regenIntervalMinutes: integer });
const profile = object(
  {
    found: boolean,
    user: object(
      {
        ...fields(integer, 'id gender realmId'),
        ...fields(text, 'name signature createdAt lastCheckInTime'),
        ...fields(number, 'experience qiValue mentalValue')
      },
      ['name', 'gender', 'realmId', 'signature', 'createdAt', 'lastCheckInTime']
    ),
    realm: object({ ...fields(integer, 'id level stageLevel'), name: text, experienceLimit: number }, ['name', 'experienceLimit']),
    mental: resource,
    qi: resource,
    isNewcomer: boolean,
    canStoreGreenBottle: boolean,
    combatPower: integer
  },
  ['user', 'realm']
);
const tasks = object({
  defaultTabKey: text,
  tabs: list(
    object({
      tabKey: text,
      tabName: text,
      visible: boolean,
      hasActionable: boolean,
      items: list(
        object(
          {
            label: text,
            statusText: text,
            status: { type: 'string', enum: ['ACTIONABLE', 'IN_PROGRESS', 'COMPLETED', 'UNAVAILABLE', 'ERROR'] },
            priority: integer,
            visible: boolean,
            actionLabel: text,
            command: { type: 'string', description: '服务端给出的聊天入口，仅供提示，不是 Expose 执行授权。' }
          },
          ['actionLabel', 'command']
        )
      )
    })
  )
});
const guild = object(
  {
    hasGuild: boolean,
    pendingApplications: integer,
    membership: object({ guildId: integer, guildName: text, roleName: text, ...fields(boolean, 'isDeputy canUpgrade isLeader') }, ['guildName', 'roleName']),
    guild: object(
      {
        ...fields(integer, 'level spiritStone spiritStoneCap prestige prestigeCap veinLevel shopLevel memberCount memberCapacity'),
        notice: text,
        minRealmName: text,
        titles: list(text)
      },
      ['veinLevel', 'shopLevel', 'notice', 'minRealmName']
    ),
    storyline: object({ initialized: boolean, allCleared: boolean, stageIndex: integer }, ['stageIndex'])
  },
  ['membership', 'guild']
);
const boss = object(
  {
    ...fields(text, 'stageName activeTimeDesc bossStatus'),
    ...fields(boolean, 'isActive hasInstance canChallenge rewardPendingUntilEnd'),
    ...fields(integer, 'stageLevel totalDamage totalAttacks playerDamage playerAttacks playerRank claimableRewardCount'),
    remainingAttempts: { type: 'string', description: '服务端剩余次数的原值文本；包括特殊值 NaN/Infinity/-Infinity，不补造次数。' },
    config: object({ ...fields(text, 'bossName bossTitle'), ...fields(integer, 'baseHp dailyAttempts maxRounds activeStartHour activeEndHour') })
  },
  ['playerRank']
);
const chapters = object({
  mentalValue: number,
  inTeam: boolean,
  overview: object({
    ...fields(number, 'totalClaimableChests currentPage totalPages totalCount milestoneTotalStars milestoneTotal milestoneClaimed milestoneClaimable'),
    showClaimAllChests: boolean,
    chapters: list(object({ ...fields(text, 'name arc'), ...fields(number, 'chapterNumber totalStars maxStars clearedCount stageCount claimableChestCount') }))
  })
});
const chapter = object({
  mentalValue: number,
  inTeam: boolean,
  detail: object({
    ...fields(text, 'status statusMessage chapterName arc'),
    ...fields(number, 'chapterNumber totalStars maxStars canClaimChestCount maxChapterNumber'),
    eliteStagesCleared: boolean,
    chests: list(object({ ...fields(number, 'index requiredStars reward'), claimed: boolean, unlocked: boolean })),
    stages: list(
      object({
        ...fields(number, 'id stageNumber spiritCost expReward spiritStoneReward bestStars dailyUsed dailyLimit maxSweepTimes'),
        ...fields(text, 'stageLabel monsterDisplayName rewardText'),
        ...fields(boolean, 'isElite canSweep canMatch'),
        drops: list(
          object({ ...fields(text, 'category currencyType itemName'), ...fields(number, 'itemId amount probability') }, ['currencyType', 'itemName', 'itemId'])
        )
      })
    )
  })
});

export const caveSchema = object({
  ...fields(number, 'maxPlots cultivatedCount plantedCount matureCount abnormalCount auraScore'),
  ...fields(text, 'auraLevel auraLabel'),
  plots: list(
    object(
      {
        ...fields(number, 'plotIndex fieldGrade baseYield expReward abnormalFlags abnormalStateCount remainingSeconds'),
        ...fields(text, 'plotState seedName cropName title detail plantedAt matureAt'),
        isMature: boolean,
        capabilities: list(object({ kind: text, careAction: text }, ['careAction']))
      },
      ['plantedAt', 'matureAt']
    )
  ),
  activeFormations: list(object(fields(text, 'formationKey formationCategory formationName formationEffect expiresAt')))
});

const meridianItem = object({
  ...fields(integer, 'index phase phaseIndex Progress RequiredProgress normalPulsesRemaining'),
  ...fields(text, 'phaseName Name Category Description'),
  completed: boolean,
  tailJumpEscalation: boolean
});
const meridians = object(
  {
    ...fields(integer, 'currentPhase basePulseRemaining extraPulseRemaining TrueQi DailyPulseRemaining CompletedCount progressPercent'),
    ...fields(text, 'currentPhaseName pulseBlockedReason'),
    ...fields(boolean, 'canPulse isLocked allCompleted'),
    current: meridianItem,
    next: meridianItem,
    meridians: list(meridianItem),
    config: object(fields(integer, 'TOTAL_COUNT QI_PER_MERIDIAN PULSE_QI_COST PULSE_PROGRESS DAILY_PULSE_MAX DAILY_EXTRA_PULSE_MAX FOUNDATION_STAGE_LEVEL'))
  },
  ['current', 'next']
);
const soulNode = object({
  ...fields(text, 'key name description requirementText'),
  ...fields(number, 'requiredInsight requiredProficiency'),
  ...fields(boolean, 'unlocked canAdvance')
});
const soul = object(
  {
    ...fields(number, 'stability insight lowYieldStreak pathProficiency'),
    ...fields(text, 'pathKey pathName pathSwitchAvailableAt'),
    effectsMaintenance: boolean,
    unlockedNodes: list(text),
    paths: list(object({ ...fields(text, 'key name stage'), proficiency: number, active: boolean, unlockedNodes: list(text), nodes: list(soulNode) })),
    panel: object(
      {
        ...fields(text, 'realmName pathStage dailyNurtureText dailyMaterialDirectionName actionUnavailable nurtureUnavailable'),
        ...fields(boolean, 'dailyDungeonClaimed canReroll switchCooldownActive allComplete'),
        materials: list(object({ name: text, quantity: number })),
        materialSourceLines: list(text),
        nurtureRuleLines: list(text),
        nextNode: soulNode,
        nurtureOptions: list(object(fields(text, 'name costText reserveWarning baseText')))
      },
      ['nextNode']
    )
  },
  ['pathKey', 'pathName', 'pathSwitchAvailableAt']
);
const equippedItem = object({
  id: integer,
  equipmentId: integer,
  equipment: object({ id: integer, name: text, equipmentTypeId: integer, setId: integer }, ['setId'])
});
const equipped = object(
  {
    playerName: text,
    canUseFifthLayerFeature: boolean,
    slots: list(object({ type: object({ id: integer, name: text }), item: equippedItem }, ['item'])),
    items: list(equippedItem)
  },
  ['playerName']
);
const learnedBook = object(
  {
    ...fields(integer, 'id status isHidden upgradeCount proficiency physicalAttack magicAttack physicalDefense magicDefense hp'),
    ...fields(number, 'speed critRate critDamage physicalAttackPercent magicAttackPercent physicalDefensePercent magicDefensePercent hpPercent'),
    ...fields(text, 'name skillType statusText damageType')
  },
  ['damageType']
);
const learned = object({
  items: list(learnedBook),
  inUseBooks: list(learnedBook),
  ...fields(integer, 'total totalPages currentPage proficiencyPoints'),
  canUseFifthLayerFeature: boolean
});
const dungeons = object({
  ...fields(integer, 'mentalValue realmLevel realmStageLevel'),
  ...fields(boolean, 'inTeam canUseMeridian canMatchDungeon'),
  pagination: object(fields(integer, 'currentPage totalPages total')),
  items: list(
    object(
      {
        ...fields(integer, 'id spiritCost freeLimit freeRemaining'),
        ...fields(text, 'name minRealmName maxRealmName'),
        isSingle: boolean,
        hasCleared: boolean
      },
      ['freeLimit', 'freeRemaining', 'minRealmName', 'maxRealmName']
    )
  )
});
const emails = object({
  total: integer,
  hasClaimable: boolean,
  hasDeletable: boolean,
  list: list(
    object({
      ...fields(integer, 'email.id state'),
      ...fields(text, 'email.name email.subtitle email.data'),
      canClaim: boolean,
      canDelete: boolean,
      'email.goods': list(object({ itemId: number, name: text, category: text, quantity: number }))
    })
  )
});
const checkin = object({
  asOf: text,
  daily: object({ available: boolean, signed: boolean, accumulatedDays: integer }),
  newcomer: object({ ...fields(boolean, 'eligible available signed'), accumulatedDays: integer, expiresOn: text, expiresAt: text }),
  guild: object(fields(boolean, 'joined available signed')),
  celestial: object(
    {
      available: boolean,
      signedSlotIds: list(integer),
      availableSlotIds: list(integer),
      nextAvailableAt: text,
      enabledSlots: list(
        object({ ...fields(integer, 'id startHour startMinute endHour endMinute weight'), name: text, ...fields(boolean, 'active signed available') })
      )
    },
    ['nextAvailableAt']
  )
});
const shop = object({
  ...fields(integer, 'page totalPages total'),
  access: object({ visibleShopCodes: list(text), deniedReason: text }, ['deniedReason']),
  products: list(
    object(
      {
        ...fields(integer, 'productId quantity used limit remaining'),
        ...fields(number, 'priceAmount secondaryPriceAmount discountPriceAmount'),
        ...fields(
          text,
          'shopCode name category priceCurrencyCode priceCurrencyName secondaryPriceCurrencyCode secondaryPriceCurrencyName limitPeriod limitPeriodName lockReason nextPurchaseAt'
        ),
        unlocked: boolean
      },
      [
        'secondaryPriceAmount',
        'discountPriceAmount',
        'priceCurrencyName',
        'secondaryPriceCurrencyCode',
        'secondaryPriceCurrencyName',
        'lockReason',
        'nextPurchaseAt'
      ]
    )
  )
});

const realm = object({ id: integer, name: text, level: integer, stageLevel: integer, experienceLimit: number });
const realmMaterials = list(object({ ...fields(integer, 'itemId requiredQuantity currentQuantity'), itemName: text, sufficient: boolean }));
const realmOverview = object({
  playerId: integer,
  experience: integer,
  realm,
  breakthrough: object(
    { currentRealm: realm, nextRealm: realm, experience: integer, requiredExp: integer, materials: realmMaterials, canBreak: boolean, message: text },
    ['nextRealm', 'materials']
  ),
  promotion: object(
    {
      currentRealm: realm,
      nextRealm: realm,
      ...fields(integer, 'stageLevel nextStageLevel'),
      experience: integer,
      requiredExp: integer,
      materials: realmMaterials,
      ...fields(boolean, 'materialsHidden canPromote hasTribulation'),
      message: text,
      probability: object({ ...fields(number, 'baseRate pillBonus pityBonus finalProbability'), failedCount: integer })
    },
    ['nextRealm', 'nextStageLevel', 'materials', 'materialsHidden', 'probability']
  )
});

const spiritRoot = object({
  ...fields(boolean, 'granted canFeed canPromote meditationActive'),
  ...fields(text, 'title qualityName nextQualityName requiredRealmName message'),
  ...fields(integer, 'quality cultivation stagePoints stageTarget overflow bonusPercent nextBonusPercent activeMeditationBonusPercent')
});
const materialSource = object({ dungeonId: integer, name: text, realmLimit: text });
const spiritRootMaterials = list(
  object(
    {
      ...fields(integer, 'itemId points quantity'),
      ...fields(text, 'name seedName'),
      locked: boolean,
      seedAvailable: boolean,
      sources: list(text),
      sourceDetails: list(materialSource),
      seedSources: list(materialSource)
    },
    ['seedAvailable']
  )
);

export const commonQueryActions = {
  get_spirit_root: query('查询灵根品质、培养进度、下阶段条件及闭关加成快照，不补发或重抽灵根。', spiritRoot, async ({ bid, uid, request }) => parseSpiritRoot(await requestBackend(bid, 'get_players_id_spirit_root', { path: { id: uid }, ...request }))
  ),
  get_spirit_root_materials: query(
    '查询灵根培养材料的库存、锁定状态、培养值与秘境/种子来源，不消耗材料。',
    spiritRootMaterials,
    async ({ bid, uid, request }) => parseSpiritRootMaterials(await requestBackend(bid, 'get_players_id_spirit_root_materials', { path: { id: uid }, ...request }))
  ),
  get_realm: query('查询境界、突破与晋升材料及资格、服务端成功率；不会执行突破、晋升或开劫。', realmOverview, async ({ bid, uid, request }) => {
    const value = await requestBackend(bid, 'get_players_id_realm_overview', { path: { id: uid }, ...request });

    if (!value || typeof value !== 'object' || !('playerId' in value) || value.playerId !== uid) {
      throw new ExposeError('INVALID_OUTPUT', '境界资料身份不匹配');
    }

    return value;
  }),
  get_meridians: query('查询经脉进度、真气、冲脉消耗与剩余次数；不执行冲脉。', meridians, async ({ bid, uid, request }) => parseMeridianView(await requestBackend(bid, 'get_players_id_meridians', { path: { id: uid }, ...request }))
  ),
  get_soul_path: query('查询神魂道路、养成材料、节点条件和可用方向；不选择或培养神魂。服务端可能初始化状态。', soul, async ({ bid, uid, request }) => parseSoulPathState(await requestBackend(bid, 'get_players_id_soul_path', { path: { id: uid }, ...request }))
  ),
  get_equipped: query('查询当前装备与空槽位；不穿戴或卸下装备。', equipped, async ({ bid, uid, request }) => parseBackendEquipped(await requestBackend(bid, 'get_players_id_equipment_equipped', { path: { id: uid }, ...request }))
  ),
  get_learned_books: query(
    '分页查询已学功法和使用中功法；visibility 默认 visible，可指定 hidden。',
    learned,
    async ({ bid, uid, request }, input) => parseBackendLearnedBooks(
        await requestBackend(bid, 'get_players_id_skill_books_learned', {
          path: { id: uid },
          query: { page: input.page ?? 1, pageSize: 5, visibility: input.visibility ?? 'visible' },
          ...request
        })
      ),
    object({ page, visibility: { type: 'string', enum: ['visible', 'hidden'] } }, ['page', 'visibility'])
  ),
  get_dungeons: query(
    '分页查询副本目录、消耗、免费次数和匹配资格。',
    dungeons,
    async ({ bid, uid, request }, input) => parseBackendDungeonCatalog(
        await requestBackend(bid, 'get_players_id_dungeons_catalog', { path: { id: uid }, query: { page: input.page ?? 1, pageSize: 5 }, ...request })
      ),
    object({ page }, ['page'])
  ),
  get_emails: query(
    '分页查询邮件及领取/删除资格，不标记已读或领取附件。',
    emails,
    async ({ bid, uid, request }, input) => parseBackendEmails(await requestBackend(bid, 'get_players_id_emails', { path: { id: uid }, query: { page: input.page ?? 1, pageSize: 5 }, ...request })),
    object({ page }, ['page'])
  ),
  get_checkin_status: query('查询每日、新人、宗门和天时签到状态及可用时段，不代为签到。', checkin, ({ bid, uid, request }) => requestBackend(bid, 'get_players_id_check_ins_status', { path: { id: uid }, ...request })
  ),
  get_shop_products: query(
    '分页查询商店商品、货币价格、限购及解锁状态；shopCode 可选，不创建购买。',
    shop,
    ({ bid, uid, request }, input) => requestBackend(bid, 'get_players_id_shop_products', {
        path: { id: uid },
        query: { page: input.page ?? 1, ...(input.shopCode ? { shopCode: input.shopCode } : {}) },
        ...request
      }),
    object({ page, shopCode: { type: 'string', minLength: 1, maxLength: 100 } }, ['page', 'shopCode'])
  ),
  get_profile: query('查询当前角色资料、修为、灵气和神念；缺失的可选字段表示服务端未提供。', profile, async ({ bid, uid, request }) => {
    const data = validatePlayerProfile(await requestBackend(bid, 'get_players_id_profile', { path: { id: uid }, ...request }));

    if (data.found && data.user?.id !== uid) {
      throw new ExposeError('INVALID_OUTPUT', '玩家资料身份不匹配');
    }

    return data;
  }),
  get_tasks: query('查询任务面板各分类状态；仅返回提示入口，不代为执行任务。', tasks, async ({ bid, uid, request }) => parseTaskPanelView(await requestBackend(bid, 'get_players_id_task_panel_view', { path: { id: uid }, ...request }))
  ),
  get_guild: query('查询当前宗门、职位、资源和宗门主线状态。未加入时不返回 membership/guild。', guild, async ({ bid, uid, request }) => parseGuildHome(await requestBackend(bid, 'get_players_id_guild_home', { path: { id: uid }, ...request }))
  ),
  get_world_boss: query('查询世界凶兽活动、伤害、挑战次数和奖励状态，不发起挑战。', boss, async ({ bid, uid, request }) => {
    const data = parseWorldBossInfo(await requestBackend(bid, 'get_players_id_world_boss_info_query', { path: { id: uid }, ...request }));

    return { ...data, remainingAttempts: String(data.remainingAttempts) };
  }),
  get_storyline_chapters: query(
    '分页查询主线章节进度、星数和可领取宝箱。',
    chapters,
    async ({ bid, uid, request }, input) => decodeStorylineCatalog(
        await requestBackend(bid, 'get_players_id_storyline_catalog', { path: { id: uid }, query: { page: input.page ?? 1 }, ...request }),
        null
      ),
    object({ page }, ['page'])
  ),
  get_storyline_chapter: query(
    '查询指定主线章节关卡、消耗、掉落和扫荡资格；保留 LOCKED/NOT_FOUND 等服务端状态。',
    chapter,
    async ({ bid, uid, request }, input) => decodeStorylineCatalog(
        await requestBackend(bid, 'get_players_id_storyline_catalog', {
          path: { id: uid },
          query: { chapterNumber: input.chapterNumber, page: 1 },
          ...request
        }),
        input.chapterNumber!
      ),
    object({ chapterNumber: page })
  ),
  get_cave: query('查询洞府灵田、成熟倒计时、照料状态和阵法，不执行种植或收获。', caveSchema, async ({ bid, uid, request }) => parseBackendCaveOverview(await requestBackend(bid, 'get_players_id_cave_view', { path: { id: uid }, ...request }))
  )
};
