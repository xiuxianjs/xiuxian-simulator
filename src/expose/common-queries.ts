import { parseBackendLimitedEventCheckinStatus } from '../api/bot/limited-event-checkin-status';
import { parseSpiritRoot, parseSpiritRootMaterials } from '../api/bot/spirit-root';
import { ExposeError } from 'alemonjs';
import { requestBackend } from '../api/bot/client';
import { validatePlayerProfile } from '../api/bot/player-profile-query';
import { parseTaskPanelView } from '../api/bot/task-panel-view';
import { parseGuildHome } from '../api/bot/guild-home-query';
import { parseWorldBossInfo } from '../api/bot/world-boss-info-queries';
import { decodeShopData } from '../api/bot/companion-shop-queries';
import { decodeStorylineCatalog } from '../api/bot/storyline-catalog-queries';
import { parseBackendCaveOverview } from '../api/bot/cave-overview-queries';
import { parseMeridianView } from '../api/bot/meridian';
import { parseSoulPathState } from '../api/bot/soul-path';
import { parseBackendEquipped } from '../api/bot/equipped-queries';
import { parseBackendLearnedBooks, parseRobotLearnedBooks } from '../api/bot/learned-books-queries';
import { parseBackendDungeonCatalog, parseBackendEmails } from '../api/bot/queries';
import { query } from './query';
import { intentIdSchema, mutation, taskInputSchema, validateIntentId } from './mutation';
import { text, number, integer, boolean, page, fields, list, object } from './schema';

const resource = object({ current: number, cap: integer, regenIntervalMinutes: integer });

export const profile = object(
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

export const chapters = object({
  mentalValue: number,
  inTeam: boolean,
  canUseMeridian: boolean,
  canUseSecondLayerFeature: boolean,
  overview: object({
    ...fields(number, 'totalClaimableChests currentPage totalPages totalCount milestoneTotalStars milestoneTotal milestoneClaimed milestoneClaimable'),
    showClaimAllChests: boolean,
    chapters: list(object({ ...fields(text, 'name arc'), ...fields(number, 'chapterNumber totalStars maxStars clearedCount stageCount claimableChestCount') }))
  })
});
export const chapter = object({
  mentalValue: number,
  inTeam: boolean,
  canUseMeridian: boolean,
  canUseSecondLayerFeature: boolean,
  detail: object({
    ...fields(text, 'status statusMessage chapterName arc'),
    ...fields(number, 'chapterNumber totalStars maxStars canClaimChestCount maxChapterNumber'),
    eliteStagesCleared: boolean,
    chests: list(object({ ...fields(number, 'index requiredStars reward'), claimed: boolean, unlocked: boolean })),
    stages: list(
      object(
        {
          ...fields(number, 'id stageNumber spiritCost expReward spiritStoneReward bestStars dailyUsed dailyLimit maxSweepTimes'),
          ...fields(text, 'stageLabel monsterDisplayName monsterName rewardText'),
          ...fields(boolean, 'isElite canSweep canMatch showBulkSweep'),
          drops: list(
            object({ ...fields(text, 'category currencyType itemName'), ...fields(number, 'itemId amount probability') }, [
              'currencyType',
              'itemName',
              'itemId'
            ])
          )
        },
        ['monsterName']
      )
    )
  })
});

export const caveSchema = object(
  {
    ...fields(number, 'maxPlots cultivatedCount plantedCount matureCount abnormalCount auraScore'),
    ...fields(text, 'auraLevel auraLabel'),
    cultivationCostText: text,
    plots: list(
      object(
        {
          ...fields(number, 'plotIndex fieldGrade baseYield expReward abnormalFlags abnormalStateCount remainingSeconds'),
          ...fields(text, 'plotState seedName cropName title detail plantedAt matureAt'),
          seedMatureHours: number,
          seedStageSplit: text,
          isMature: boolean,
          capabilities: list(object({ kind: text, careAction: text }, ['careAction']))
        },
        ['plantedAt', 'matureAt', 'seedMatureHours', 'seedStageSplit']
      )
    ),
    activeFormations: list(object(fields(text, 'formationKey formationCategory formationName formationEffect expiresAt'))),
    stasisFormation: object({ name: text, remainingText: text })
  },
  ['cultivationCostText', 'stasisFormation']
);

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
    items: list(equippedItem),
    sets: list(
      object(
        {
          id: integer,
          name: text,
          count: integer,
          effects: list(
            object({
              active: boolean,
              effect: object({
                ...fields(integer, 'pieces physicalAttack magicAttack physicalDefense magicDefense hp speed'),
                ...fields(
                  number,
                  'physicalAttackPercent magicAttackPercent physicalDefensePercent magicDefensePercent hpPercent speedPercent critRate critDamage antiCritRate hitRate dodgeRate normalAttackCritRate skillCritRate ultimateCritRate allSkillCritRate'
                )
              })
            })
          ),
          recoveryEffects: list(
            object({
              ...fields(text, 'source name status statusText conditionText'),
              ...fields(number, 'templateId mp mental pieces currentPieces'),
              active: boolean
            })
          )
        },
        ['name', 'recoveryEffects']
      )
    )
  },
  ['playerName']
);

function parseEquippedForExpose(raw: unknown) {
  const parsed = parseBackendEquipped(raw);
  const rawSets = (raw as { sets: Array<{ recoveryEffects?: unknown }> }).sets;

  return {
    ...parsed,
    sets: parsed.sets.map((set, index) => ({
      ...set,
      recoveryEffects: rawSets[index].recoveryEffects === null || rawSets[index].recoveryEffects === undefined ? undefined : set.recoveryEffects
    }))
  };
}
const learnedBook = object(
  {
    ...fields(integer, 'id status isHidden upgradeCount proficiency physicalAttack magicAttack physicalDefense magicDefense hp'),
    ...fields(number, 'speed critRate critDamage physicalAttackPercent magicAttackPercent physicalDefensePercent magicDefensePercent hpPercent'),
    ...fields(integer, 'maxPhysicalAttack maxMagicAttack maxPhysicalDefense maxMagicDefense maxHp maxSpeed'),
    ...fields(number, 'maxPhysicalAttackPercent maxMagicAttackPercent maxPhysicalDefensePercent maxMagicDefensePercent maxHpPercent maxCritRate maxCritDamage'),
    ...fields(boolean, 'canHide canReset'),
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

export const dungeons = object({
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

export const spiritRoot = object({
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

type TaskPagedInput = { taskInput: string; page?: number; intentId?: string };

function taskPage(input: TaskPagedInput, label: '我的功法' | '我的邮件') {
  const command = input.taskInput
    .trim()
    .replace(/^[!！/#＃]\s*/, '')
    .trim();
  const match = new RegExp(`^${label}(?:\\s+(\\d+))?$`).exec(command);
  const rawPage = match?.[1] ?? null;
  const number = rawPage === null ? 1 : Number(rawPage);

  if (!match || !Number.isSafeInteger(number) || number < 1 || (input.page !== undefined && input.page !== number)) {
    throw new ExposeError('INVALID_INPUT', `${label}任务指令与页码不匹配`);
  }

  return { command: `/${command}`, rawPage, number };
}

export const commonQueryActions = {
  execute_task_learned_books: mutation<TaskPagedInput>(
    '执行我的功法连锁任务查看步骤，页码从指令读取；显示页沿用服务端原有分页规则，不学习或升级。',
    'skill-books.learned',
    object({ taskInput: taskInputSchema, page, intentId: intentIdSchema }, ['page', 'intentId']),
    learned,
    input => taskPage(input, '我的功法').command,
    (data, input) => {
      const result = parseRobotLearnedBooks(data);

      if (result.displayPage !== taskPage(input, '我的功法').number) {
        throw new Error('功法列表回执页码不匹配');
      }

      return result.page;
    },
    input => ({ page: taskPage(input, '我的功法').rawPage }),
    input => {
      validateIntentId(input.intentId);
      taskPage(input, '我的功法');
    },
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  execute_task_emails: mutation<TaskPagedInput>(
    '执行我的邮件连锁任务查看步骤，页码从指令读取，返回邮件及领取、删除资格，不标记已读或领取。',
    'emails.list',
    object({ taskInput: taskInputSchema, page, intentId: intentIdSchema }, ['page', 'intentId']),
    emails,
    input => taskPage(input, '我的邮件').command,
    (data, input) => {
      if (
        !data ||
        typeof data !== 'object' ||
        Array.isArray(data) ||
        (data as Record<string, unknown>).pageText !== String(taskPage(input, '我的邮件').number)
      ) {
        throw new Error('邮件列表回执页码不匹配');
      }

      return parseBackendEmails((data as Record<string, unknown>).data);
    },
    input => ({ pageText: String(taskPage(input, '我的邮件').number) }),
    input => {
      validateIntentId(input.intentId);
      taskPage(input, '我的邮件');
    },
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  execute_task_shop: mutation<{ taskInput: string; intentId?: string }>(
    '执行商店连锁任务查看步骤，返回第一页商品、价格、限购和可用状态；不购买商品。',
    'shops.list',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    shop,
    () => '/商店',
    data => {
      decodeShopData(data as Record<string, unknown>);

      return data;
    },
    () => ({ page: 1 }),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  execute_task_equipped: mutation<{ taskInput: string; intentId?: string }>(
    '执行连锁任务中的我的装备步骤，返回当前穿戴、空槽及套装效果；分别检查任务推进和查询回执。同消息新操作使用新 intentId，同次重试沿用原编号。',
    'equipment.equipped',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    equipped,
    () => '/我的装备',
    parseEquippedForExpose,
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  execute_task_meridians: mutation<{ taskInput: string; intentId?: string }>(
    '执行经络连锁任务查看步骤，返回经络状态和任务推进回执。',
    'meridians.view',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    meridians,
    () => '/经络',
    parseMeridianView,
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  execute_task_world_boss: mutation<{ taskInput: string; intentId?: string }>(
    '执行凶兽连锁任务查看步骤，返回活动状态和任务推进回执，不发起挑战。',
    'world-boss.info',
    object({ taskInput: taskInputSchema, intentId: intentIdSchema }, ['intentId']),
    boss,
    () => '/凶兽',
    data => {
      const result = parseWorldBossInfo(data);

      return { ...result, remainingAttempts: String(result.remainingAttempts) };
    },
    () => ({}),
    input => validateIntentId(input.intentId),
    { intentId: input => input.intentId, taskInput: input => input.taskInput }
  ),
  get_meditation_active: query(
    '查询当前玩家闭关的服务端 Redis 活跃标记；只读取标记，不开始或结束闭关，也不表示收益已结算。',
    object({ active: boolean }),
    ({ bid, uid, request }) => requestBackend(bid, 'get_players_id_meditation_active', { path: { id: uid }, ...request })
  ),
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
  get_equipped: query(
    '查询当前装备、空槽位与套装效果；slots[].item.id 是玩家实例编号，可用于 unequip_equipment_by_id；equipmentId 是模板编号。缺省恢复效果表示服务端未提供。',
    equipped,
    async ({ bid, uid, request }) => {
      const raw = await requestBackend(bid, 'get_players_id_equipment_equipped', { path: { id: uid }, ...request });

      return parseEquippedForExpose(raw);
    }
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
    '分页查询秘境目录、消耗、免费次数和匹配资格。items[].id 用于 get_dungeon_detail_by_id、challenge_dungeon_by_id、sweep_dungeon_by_id、start_dungeon_match。',
    dungeons,
    async ({ bid, uid, request }, input) => parseBackendDungeonCatalog(
        await requestBackend(bid, 'get_players_id_dungeons_catalog', { path: { id: uid }, query: { page: input.page ?? 1, pageSize: 5 }, ...request })
      ),
    object({ page }, ['page'])
  ),
  get_emails: query(
    '分页查询邮件及领取/删除资格，不标记已读或领取附件。list[]."email.id" 可传给 get_email_detail、claim_email 和 delete_email。',
    emails,
    async ({ bid, uid, request }, input) => parseBackendEmails(await requestBackend(bid, 'get_players_id_emails', { path: { id: uid }, query: { page: input.page ?? 1, pageSize: 5 }, ...request })),
    object({ page }, ['page'])
  ),
  get_limited_event_checkin_status: query(
    '查询本人限时活动签到进度、今日资格与奖励状态；不会执行签到。',
    list(
      object(
        {
          ...fields(text, 'eventTitle subTitle startTime endTime'),
          ...fields(integer, 'subActivityId totalDays todayDayIndex'),
          signedDays: list(integer),
          canClaimToday: boolean,
          rewards: list(object({ dayIndex: integer, rewardName: text, signed: boolean, quantity: integer }, ['quantity']))
        },
        ['endTime', 'todayDayIndex']
      )
    ),
    async ({ bid, uid, request }) => {
      const raw = await requestBackend(bid, 'get_players_id_limited_events_check_ins', { path: { id: uid }, ...request });
      const parsed = parseBackendLimitedEventCheckinStatus(raw);
      const rows = raw as Array<{ endTime?: unknown; todayDayIndex?: unknown; rewards: Array<{ quantity?: unknown }> }>;

      return parsed.map((item, i) => ({
        ...item,
        ...(typeof rows[i].endTime === 'string' ? { endTime: rows[i].endTime } : {}),
        ...(Number.isSafeInteger(rows[i].todayDayIndex) ? { todayDayIndex: rows[i].todayDayIndex } : {}),
        rewards: item.rewards.map((reward, j) => ({
          ...reward,
          ...(Number.isSafeInteger(rows[i].rewards[j].quantity) ? { quantity: rows[i].rewards[j].quantity } : {})
        }))
      }));
    }
  ),
  get_checkin_status: query('查询每日、新人、宗门和天时签到状态及可用时段，不代为签到。', checkin, ({ bid, uid, request }) => requestBackend(bid, 'get_players_id_check_ins_status', { path: { id: uid }, ...request })
  ),
  get_shop_products: query(
    '分页查询商店商品、货币价格、限购及解锁状态；products[].productId 可用于 preview_shop_purchase，shopCode 可选，DAOLV 是道侣商店。',
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
  get_tasks: query(
    '查询旧版任务面板七类状态；师门、道侣及条目选项请使用 get_task_panel。返回的命令仅供提示，不代为执行。',
    tasks,
    async ({ bid, uid, request }) => parseTaskPanelView(await requestBackend(bid, 'get_players_id_task_panel_view', { path: { id: uid }, ...request }))
  ),
  get_guild: query('查询当前宗门、职位、资源和宗门主线状态。未加入时不返回 membership/guild。', guild, async ({ bid, uid, request }) => parseGuildHome(await requestBackend(bid, 'get_players_id_guild_home', { path: { id: uid }, ...request }))
  ),
  get_world_boss: query('查询世界凶兽活动、伤害、挑战次数和奖励状态，不发起挑战。', boss, async ({ bid, uid, request }) => {
    const data = parseWorldBossInfo(await requestBackend(bid, 'get_players_id_world_boss_info_query', { path: { id: uid }, ...request }));

    return { ...data, remainingAttempts: String(data.remainingAttempts) };
  }),
  get_storyline_chapters: query(
    '分页查询主线章节进度、星数和可领取宝箱；章节 chapterNumber 可传给 get_storyline_chapter。',
    chapters,
    async ({ bid, uid, request }, input) => decodeStorylineCatalog(
        await requestBackend(bid, 'get_players_id_storyline_catalog', { path: { id: uid }, query: { page: input.page ?? 1 }, ...request }),
        null
      ),
    object({ page }, ['page'])
  ),
  get_storyline_chapter: query(
    '查询指定主线章节关卡、消耗、掉落和扫荡资格；关卡 stageNumber 与 chapterNumber 用于 challenge_storyline 或 sweep_storyline，保留 LOCKED/NOT_FOUND 等服务端状态。',
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
