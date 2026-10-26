import { parseGameTime, formatGameTime } from '@src/utils/gameTime';
import { number as integer } from '../schemas/ranking-values';
import { getCurrentEvent } from 'alemonjs';
import { getEventAccessFacts } from './access-facts';
import type { EncyclopediaDetailFacts } from '../schemas/encyclopedia';
import { requestBackend } from './client';
import { parseRobberyRecord } from './robbery-records';

function identity(bid?: string): string {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return bid;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('查询接口返回格式不完整');
  }

  return value as Record<string, unknown>;
}
function rows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error('查询接口缺少列表');
  }

  return value.map(record);
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('查询接口缺少数值字段');
  }

  return value;
}
function boolean(value: unknown, message = '查询接口缺少布尔字段'): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(message);
  }

  return value;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('查询接口缺少文本字段');
  }

  return value;
}
function date(value: unknown): Date {
  const result = parseGameTime(text(value));

  if (!result) {
    throw new Error('查询接口日期无效');
  }

  return result.toDate();
}

export async function getBackendBlocklist(bid: string | undefined, uid: number) {
  const data = await requestBackend(identity(bid), 'get_players_id_blocklist', { path: { id: uid } });

  return parseBackendBlocklist(data);
}

export function parseBackendBlocklist(data: unknown) {
  return rows(data).map(row => ({ id: integer(row.id), blockedUserName: text(row.blockedUserName) || '未知用户', createdAt: date(row.createdAt) }));
}

export async function getBackendFriendRequests(bid: string | undefined, uid: number) {
  const data = await requestBackend(identity(bid), 'get_players_id_friend_requests', { path: { id: uid } });

  return parseBackendFriendRequests(data);
}

export function parseBackendFriendRequests(data: unknown) {
  return rows(data).map(row => {
    const id = integer(row.id);
    const fromUserId = integer(row.fromUserId);
    const fromUserName = text(row.fromUserName) || '未知用户';
    const realmId = integer(row.fromUserRealmId);
    const realmName = text(row.fromUserRealmName);

    return {
      id,
      fromUserId,
      fromUserName,
      fromUserRealm: realmId ? realmName || '未知境界' : '无境界',
      message: row.message === undefined || row.message === null ? null : text(row.message),
      createdAt: date(row.createdAt)
    };
  });
}

export async function getBackendSocialAccess(bid: string, uid: number) {
  const cached = getEventAccessFacts(getCurrentEvent(), bid, uid)?.social;

  if (cached) {
    return cached;
  }
  const data = record(await requestBackend(identity(bid), 'get_players_id_social_access', { path: { id: uid } }));

  const ok = boolean(data.canUseFifthLayerFeature, '查询接口缺少境界资格');

  return { ok, realmName: text(data.realmName) || '未知' };
}

export async function getBackendToolCategories(bid?: string): Promise<string[]> {
  const data = record(await requestBackend(identity(bid), 'get_encyclopedia_categories'));
  const category = rows(data.items).find(row => row.category === '天工');

  if (!category || !Array.isArray(category.subCategories)) {
    throw new Error('查询接口缺少天工分类');
  }

  return category.subCategories.map(text);
}

export async function getBackendEncyclopedia(bid: string | undefined, category: string, subCategory: string | null, page: number) {
  return parseBackendEncyclopedia(
    await requestBackend(identity(bid), 'get_encyclopedia', { query: { category, subCategory: subCategory ?? undefined, page } }),
    category
  );
}
export function parseBackendEncyclopedia(value: unknown, category: string) {
  const data = record(value);
  const pagination = record(data.page);

  return {
    code: 'OK' as const,
    data: {
      items: rows(data.items).map(row => ({ id: integer(row.id), name: text(row.name), gradeName: text(row.gradeName) })),
      totalCount: integer(pagination.totalCount),
      totalPages: integer(pagination.totalPages),
      page: integer(pagination.page),
      detailPrefix: category === '材料' ? '道具' : category === '本命' ? '本命物' : category
    }
  };
}

export async function getBackendMemories(bid: string | undefined, uid: number) {
  return parseBackendMemories(await requestBackend(identity(bid), 'get_players_id_memories', { path: { id: uid } }));
}

export function parseBackendMemories(value: unknown) {
  const data = record(value);

  if (!Array.isArray(data.items)) {
    throw new Error('回忆接口展示回执不完整');
  }
  const canShowStoryButton = boolean(data.canShowStoryButton, '回忆接口展示回执不完整');
  const totalDays = integer(data.totalDays, '回忆接口展示回执不完整');
  const items = data.items.map(value => {
    const item = record(value);

    if (typeof item.label !== 'string' || typeof item.text !== 'string' || (item.subtext !== undefined && typeof item.subtext !== 'string')) {
      throw new Error('回忆接口展示回执不完整');
    }

    return { label: item.label, text: item.text, subtext: item.subtext };
  });

  return { name: text(data.name), totalDays, canShowStoryButton, items };
}

export async function getBackendStory(bid: string | undefined, uid: number) {
  return parseBackendStory(await requestBackend(identity(bid), 'get_players_id_story', { path: { id: uid } }));
}

export function parseBackendStory(value: unknown) {
  const data = record(value);

  if (!Array.isArray(data.items)) {
    throw new Error('故事接口展示回执不完整');
  }
  const canShowMemoryButton = boolean(data.canShowMemoryButton, '故事接口展示回执不完整');
  const items = data.items.map(value => {
    const item = record(value);

    if (typeof item.label !== 'string' || typeof item.value !== 'string' || typeof item.flavor !== 'string') {
      throw new Error('故事接口展示回执不完整');
    }

    return { label: item.label, value: item.value, flavor: item.flavor };
  });

  return { name: text(data.name), items, canShowMemoryButton };
}

// Mail list is read-only; opening, claiming and deleting remain separate actions.
export async function getBackendEmails(bid: string | undefined, uid: number, page: number, pageSize: number) {
  return parseBackendEmails(await requestBackend(identity(bid), 'get_players_id_emails', { path: { id: uid }, query: { page, pageSize } }));
}
export function parseBackendEmails(value: unknown) {
  const data = record(value);

  return {
    total: integer(data.total),
    list: rows(data.list).map(emailData),
    hasClaimable: boolean(data.hasClaimable),
    hasDeletable: boolean(data.hasDeletable)
  };
}

function emailData(row: Record<string, unknown>) {
  return {
    'email.id': integer(row.id),
    'email.name': text(row.name),
    'email.subtitle': text(row.subtitle),
    'email.data': text(row.data),
    'email.goods': rows(row.goods).map(good => ({
      itemId: good.itemId === null || good.itemId === undefined ? 0 : number(good.itemId),
      name: good.name === null || good.name === undefined ? '' : text(good.name),
      category: text(good.category),
      quantity: good.quantity === null || good.quantity === undefined ? 1 : number(good.quantity)
    })),
    state: integer(row.state),
    canClaim: boolean(row.canClaim),
    canDelete: boolean(row.canDelete)
  };
}

export async function getBackendEncyclopediaDetail(bid: string | undefined, category: string, entryId: number) {
  return parseBackendEncyclopediaDetail(
    await requestBackend(identity(bid), 'get_encyclopedia_category_entryId', { path: { category, entryId } }),
    category,
    entryId
  );
}
export function parseBackendEncyclopediaDetail(raw: unknown, category: string, entryId: number) {
  const data = record(raw);
  const value = record(data.record);

  if (integer(value.id) !== entryId || text(data.category) !== category) {
    throw new Error('图鉴详情返回对象不一致');
  }
  text(value.name);
  if (category === '本命' || category === '本命物') {
    text(value.mainAffixText);
    text(value.subAffixText);
  }
  const sources = record(data.sources);
  const lore = data.lore === null ? null : record(data.lore);
  const nullableText = (v: unknown) => (v === null ? null : text(v));
  const nullableInteger = (v: unknown) => (v === null ? null : integer(v));
  const facts: EncyclopediaDetailFacts = {
    view: rows(data.view).map(block => {
      const kind = text(block.kind);

      if (
        (kind !== 'text' && kind !== 'newline' && kind !== 'quote' && kind !== 'source') ||
        (kind !== 'newline' && typeof block.text !== 'string') ||
        (block.text !== undefined && typeof block.text !== 'string')
      ) {
        throw new Error('图鉴详情展示投影无效');
      }
      if (block.command !== undefined && typeof block.command !== 'string') {
        throw new Error('图鉴详情跳转信息无效');
      }

      return { kind, text: block.text === undefined ? undefined : text(block.text), command: block.command };
    }),
    sources: {
      stages: rows(sources.stages).map(row => {
        if (row.isElite !== null && typeof row.isElite !== 'boolean') {
          throw new Error('图鉴缺少关卡类型');
        }

        return {
          probability: integer(row.probability),
          chapterId: nullableInteger(row.chapterId),
          chapterName: nullableText(row.chapterName),
          stageLabel: nullableText(row.stageLabel),
          isElite: row.isElite
        };
      }),
      dungeons: rows(sources.dungeons).map(row => ({ probability: integer(row.probability), dungeonName: nullableText(row.dungeonName) })),
      recipes: rows(sources.recipes).map(row => ({
        id: integer(row.id),
        name: text(row.name),
        pillItemId: integer(row.pillItemId),
        inferiorPillItemId: nullableInteger(row.inferiorPillItemId)
      })),
      shops: rows(sources.shops).map(row => ({
        shopCode: text(row.shopCode),
        priceAmount: integer(row.priceAmount),
        priceCurrencyCode: text(row.priceCurrencyCode)
      })),
      guildShop: rows(sources.guildShop).map(row => ({ priceContribution: integer(row.priceContribution) })),
      materials: rows(sources.materials).map(row => ({ recipeId: integer(row.recipeId), recipeName: text(row.recipeName) }))
    },
    lore: lore === null ? null : { gameplay: nullableText(lore.gameplay), lore: nullableText(lore.lore) },
    equipmentSet: data.equipmentSet === null ? null : { name: text(record(data.equipmentSet).name) },
    setEffects: rows(data.setEffects)
  };

  if (category === '功法') {
    if (!Object.hasOwn(value, 'skill')) {
      throw new Error('图鉴缺少技能关联');
    }
  }
  if (category === '装备' && !Object.hasOwn(value, 'equipmentType')) {
    throw new Error('图鉴缺少装备类型');
  }
  const kinds: Record<string, string> = {
    道具: 'item',
    材料: 'item',
    装备: 'equipment',
    天工: 'professionTool',
    功法: 'skillBook',
    本命: 'soulArtifact',
    本命物: 'soulArtifact'
  };

  return { category: kinds[category], record: value, grade: data.grade === null ? null : record(data.grade), facts };
}

export async function getBackendAchievements(bid: string | undefined, page: number, pageSize: number, uid?: number) {
  return validateBackendAchievements(
    uid === undefined
      ? await requestBackend(identity(bid), 'get_achievements', { query: { page, pageSize } })
      : await requestBackend(identity(bid), 'get_players_id_achievements', { path: { id: uid }, query: { page, pageSize } }),
    uid !== undefined
  );
}

export function validateBackendAchievements(value: unknown, completed: boolean) {
  const data = record(value);
  const pagination = record(data.page);

  return {
    achievements: rows(data.items).map(row => {
      if (completed && row.completedAt === undefined) {
        throw new Error('成就完成时间缺失');
      }

      return {
        id: integer(row.id),
        name: row.name === null ? '未知成就' : text(row.name),
        description: row.description === null ? '暂无描述' : text(row.description),
        displayIndex: !completed ? integer(row.displayIndex) : null,
        completedAt: row.completedAt === null || row.completedAt === undefined ? null : date(row.completedAt).toISOString()
      };
    }),
    total: integer(pagination.total),
    currentPage: integer(pagination.currentPage),
    totalPages: integer(pagination.totalPages)
  };
}

export async function getBackendGiftRecords(bid: string | undefined, uid: number, mode: 'all' | 'send' | 'receive', page: number, pageSize: number) {
  return parseBackendGiftRecords(await requestBackend(identity(bid), 'get_players_id_companion_gifts', { path: { id: uid }, query: { mode, page, pageSize } }));
}

export function parseBackendGiftRecords(value: unknown) {
  const data = record(value);

  return {
    rows: rows(data.list).map(row => ({
      id: integer(row.id),
      senderUid: integer(row.senderUid),
      receiverUid: integer(row.receiverUid),
      giftName: text(row.giftName),
      quantity: integer(row.quantity),
      intimacyGained: integer(row.intimacyGained),
      tongxinGained: integer(row.tongxinGained),
      premium: boolean(row.premium),
      relationText: text(row.relationText),
      created_at: date(row.createdAt),
      senderName: row.senderName === null ? `#${integer(row.senderUid)}` : text(row.senderName),
      receiverName: row.receiverName === null ? `#${integer(row.receiverUid)}` : text(row.receiverName)
    })),
    currentPage: integer(data.page),
    totalPages: integer(data.totalPages),
    total: integer(data.total)
  };
}

export async function getBackendFriends(bid: string | undefined, uid: number, page: number, pageSize: number) {
  return parseBackendFriends(await requestBackend(identity(bid), 'get_players_id_friends', { path: { id: uid }, query: { page, pageSize } }));
}

export function parseBackendFriends(value: unknown) {
  const data = record(value);

  const hasCompanion = boolean(data.hasCompanion, '查询接口缺少道侣状态');

  return {
    total: integer(data.total),
    currentPage: integer(data.currentPage),
    pageSize: integer(data.pageSize),
    maxFriends: integer(data.maxFriends),
    myGender: integer(data.myGender),
    hasCompanion,
    list: rows(data.list).map(row => {
      const userExists = boolean(row.userExists, '查询接口缺少好友状态');
      const friendHasCompanion = boolean(row.hasCompanion, '查询接口缺少好友状态');

      if (typeof row.relationText !== 'string' || typeof row.spiritBondLevel !== 'string') {
        throw new Error('查询接口缺少好友关系展示信息');
      }

      const canProposeCompanion = boolean(row.canProposeCompanion, '查询接口缺少好友关系展示信息');
      const friendName = text(row.friendName);

      return {
        friendId: integer(row.friendId),
        friendName: userExists ? friendName : '未知用户',
        relationType: integer(row.relationType),
        relationText: row.relationText,
        intimacy: integer(row.intimacy),
        spiritBondLevel: row.spiritBondLevel,
        canProposeCompanion,
        gender: row.gender === null ? null : integer(row.gender),
        hasCompanion: friendHasCompanion
      };
    })
  };
}

export async function getBackendFriendAccess(bid: string | undefined, uid: number) {
  const cached = bid ? getEventAccessFacts(getCurrentEvent(), bid, uid)?.social : undefined;

  if (cached) {
    return [
      { ok: cached.canUseFifthLayerFeature, realmName: cached.realmName },
      { ok: cached.canUseSpar, realmName: cached.realmName }
    ] as const;
  }
  const data = record(await requestBackend(identity(bid), 'get_players_id_social_access', { path: { id: uid } }));

  const canUseSpar = boolean(data.canUseSpar, '查询接口缺少好友资格');
  const canUseFifthLayerFeature = boolean(data.canUseFifthLayerFeature, '查询接口缺少好友资格');
  const realmName = text(data.realmName) || '未知';

  return [
    { ok: canUseFifthLayerFeature, realmName },
    { ok: canUseSpar, realmName }
  ] as const;
}

export async function getBackendGuilds(bid: string | undefined, page: number, pageSize: number) {
  return parseBackendGuilds(await requestBackend(identity(bid), 'get_guilds', { query: { page, pageSize } }));
}

export function parseBackendGuilds(value: unknown) {
  const data = record(value);

  return {
    guilds: rows(data.guilds).map(row => {
      if (!Array.isArray(row.titles)) {
        throw new Error('查询接口缺少宗门称号');
      }
      const name = text(row.name);

      return {
        id: integer(row.id),
        name,
        intro: row.intro === null ? `${name}，欢迎加入` : text(row.intro),
        memberCount: integer(row.memberCount),
        levelId: integer(row.levelId),
        levelName: row.level === null ? undefined : `${integer(row.level)}级`,
        minRealmName: row.minRealmName === null ? undefined : text(row.minRealmName),
        titles: row.titles.map(value => text(value).trim()).filter(Boolean)
      };
    }),
    total: integer(data.total),
    currentPage: integer(data.currentPage),
    totalPages: integer(data.totalPages)
  };
}

export async function getBackendGuildAccess(bid: string | undefined, uid: number) {
  const cached = bid ? getEventAccessFacts(getCurrentEvent(), bid, uid)?.social : undefined;

  if (cached) {
    return { ok: cached.canCreateOrApplyGuild, realmName: cached.realmName };
  }
  const data = record(await requestBackend(identity(bid), 'get_players_id_social_access', { path: { id: uid } }));

  const canCreateOrApplyGuild = boolean(data.canCreateOrApplyGuild, '查询接口缺少宗门资格');

  return { ok: canCreateOrApplyGuild, realmName: text(data.realmName) || '未知' };
}

export async function getBackendTeams(bid: string | undefined, page: number, pageSize: number) {
  const data = record(await requestBackend(identity(bid), 'get_teams', { query: { page, pageSize } }));

  return parseBackendTeams(data);
}

export function parseBackendTeams(value: unknown) {
  const data = record(value);
  const teams = rows(data.items).map(row => ({
    teamId: integer(row.id),
    leaderName: row.leaderName === null ? '未知' : text(row.leaderName),
    memberCount: integer(row.memberCount),
    maxMembers: integer(row.maxMembers),
    minRealmName: row.minRealmName === null ? null : text(row.minRealmName)
  }));
  const total = integer(data.total);
  const responsePageSize = integer(data.pageSize);

  if (responsePageSize <= 0) {
    throw new Error('队伍列表分页大小无效');
  }

  return { teams, total, currentPage: integer(data.page), totalPages: Math.ceil(total / responsePageSize) };
}

export async function getBackendGuildLogs(bid: string | undefined, uid: number, page: number, pageSize: number) {
  return parseGuildLogs(await requestBackend(identity(bid), 'get_players_id_guild_logs', { path: { id: uid }, query: { page, pageSize } }));
}

export function parseGuildLogs(value: unknown) {
  const data = record(value);

  const hasGuild = boolean(data.hasGuild, '宗门日志接口返回格式不完整');

  return {
    hasGuild,
    guildName: text(data.guildName),
    total: integer(data.total),
    page: integer(data.page),
    totalPages: integer(data.totalPages),
    logs: rows(data.logs).map(row => ({
      id: integer(row.id),
      content: text(row.content),
      formattedTime: formatGameTime(row.createdAt === undefined || row.createdAt === null ? null : text(row.createdAt))
    }))
  };
}

export async function getBackendMasterRanking(bid: string | undefined, uid: number) {
  return parseMasterRanking(await requestBackend(identity(bid), 'get_players_id_master_ranking', { path: { id: uid } }));
}

export function parseMasterRanking(value: unknown) {
  const data = record(value);
  const stats = (row: Record<string, unknown>) => ({
    masterVirtueLevel: integer(row.virtueLevel),
    virtueTitle: text(row.virtueTitle),
    masterVirtueExp: integer(row.virtueExperience),
    totalGraduatedCount: integer(row.totalGraduatedCount),
    activeDiscipleCount: integer(row.activeDiscipleCount)
  });

  const self = data.self === null ? undefined : record(data.self);

  return {
    nearby: rows(data.nearby).map(row => ({
      ...stats(row),
      rank: integer(row.rank),
      userId: integer(row.userId),
      userName: row.userName === null ? '未知修士' : text(row.userName)
    })),
    top: rows(data.top).map(row => ({
      ...stats(row),
      rank: integer(row.rank),
      userId: integer(row.userId),
      userName: row.userName === null ? '未知修士' : text(row.userName)
    })),
    self: self === undefined ? undefined : { ...stats(self), rank: integer(self.rank) }
  };
}

export async function getBackendGachaCatalog(bid: string | undefined, uid: number) {
  const data = record(await requestBackend(identity(bid), 'get_players_id_gacha_catalog', { path: { id: uid } }));

  return parseGachaCatalog(data);
}

export function parseGachaCatalog(data: Record<string, unknown>) {
  if (typeof data.active !== 'boolean') {
    throw new Error('活动目录接口返回格式不完整');
  }
  if (data.accessStatus !== 'NO_BANNER' && data.accessStatus !== 'REALM_LOW' && data.accessStatus !== 'READY') {
    throw new Error('活动目录接口返回访问状态无效');
  }
  const realm = (value: unknown) => {
    if (value === null) {
      return null;
    }
    const row = record(value);

    return { id: integer(row.id), name: text(row.name), level: integer(row.level), stageLevel: integer(row.stageLevel) };
  };

  return {
    active: data.active,
    accessStatus: data.accessStatus,
    bannerId: integer(data.bannerId),
    minRealm: realm(data.minRealm),
    userRealm: realm(data.userRealm),
    pools: rows(data.pools).map(row => ({ id: integer(row.id), poolName: text(row.poolName), realm: realm(row.realm), merchantTitle: text(row.merchantTitle) }))
  };
}
export async function getBackendGachaHistory(bid: string | undefined, uid: number, poolId: number, limit = 20) {
  const data = await requestBackend(identity(bid), 'get_players_id_gacha_pools_poolId_history', { path: { id: uid, poolId }, query: { limit } });

  return parseGachaHistory(data);
}

export function parseGachaHistory(data: unknown) {
  return rows(data).map(row => {
    if (typeof row.isFree !== 'boolean') {
      throw new Error('记录接口返回格式不完整');
    }

    return {
      id: integer(row.id),
      tierName: text(row.tierName),
      itemSnapshotJson: text(row.itemSnapshotJson),
      isFree: row.isFree,
      created_at: date(row.createdAt)
    };
  });
}

export async function getBackendGachaGoods(bid: string | undefined, poolId: number) {
  const data = await requestBackend(identity(bid), 'get_gacha_pools_poolId_items', { path: { poolId } });

  return parseGachaGoods(data);
}

export function parseGachaGoods(data: unknown) {
  return rows(data).map(tier => ({
    tierName: text(tier.tierName),
    tierLabel: text(tier.tierLabel),
    tierWeight: integer(tier.tierWeight),
    probabilityPercent: number(tier.probabilityPercent),
    pityLimit: tier.pityLimit === null ? null : integer(tier.pityLimit),
    items: rows(tier.items).map(item => {
      if (typeof item.isUp !== 'boolean' || typeof item.canViewDetail !== 'boolean') {
        throw new Error('货品接口返回格式不完整');
      }

      return {
        itemName: text(item.itemName),
        itemType: text(item.itemType),
        itemTypeLabel: text(item.itemTypeLabel),
        displayName: text(item.displayName),
        canViewDetail: item.canViewDetail,
        quantity: integer(item.quantity),
        isUp: item.isUp,
        probability: number(item.probability),
        actualRatePercent: number(item.actualRatePercent)
      };
    })
  }));
}

export async function getBackendGachaOverview(bid: string | undefined, uid: number) {
  const data = record(await requestBackend(identity(bid), 'get_players_id_gacha_overview', { path: { id: uid } }));

  return parseGachaOverview(data);
}

export function parseGachaOverview(value: unknown) {
  const data = record(value);

  if (data.banner === null) {
    return null;
  }
  if (data.accessStatus !== 'REALM_LOW' && data.accessStatus !== 'READY') {
    throw new Error('转盘概览接口返回访问状态无效');
  }
  const realm = (value: unknown) => {
    if (value === null) {
      return null;
    }
    const r = record(value);

    return { name: text(r.name), level: integer(r.level), stageLevel: integer(r.stageLevel) };
  };
  const banner = record(data.banner);
  const assets = record(data.currencies);
  const currencies = {
    spiritStone: integer(assets.spiritStone),
    spiritsCrystal: integer(assets.spiritsCrystal),
    spiritsMilk: integer(assets.spiritsMilk),
    signInCoin: integer(assets.signInCoin),
    towerScore: integer(assets.towerScore),
    reputation: integer(assets.reputation),
    tongxin: integer(assets.tongxin),
    greenBottle: integer(assets.greenBottle)
  };

  return {
    title: text(banner.title),
    description: text(banner.description),
    startTime: date(banner.startTime),
    endTime: date(banner.endTime),
    minRealm: realm(data.minRealm),
    accessStatus: data.accessStatus,
    userRealm: realm(data.userRealm),
    currencies,
    pools: rows(banner.pools).map(pool => {
      const pity = record(pool.pity);

      return {
        id: integer(pool.id),
        poolName: text(pool.poolName),
        poolLevel: integer(pool.poolLevel),
        currencyCode: text(pool.currencyCode),
        currencyName: text(pool.currencyName),
        pricePerPull: integer(pool.pricePerPull),
        tenPullCost: integer(pool.tenPullCost),
        maxUpPerUser: integer(pool.maxUpPerUser),
        realm: realm(pool.realm),
        merchantTitle: text(pool.merchantTitle),
        tiers: rows(pool.tiers).map(t => ({
          tierName: text(t.tierName),
          tierLabel: text(t.tierLabel),
          weight: integer(t.weight),
          probabilityPercent: number(t.probabilityPercent),
          pityLimit: t.pityLimit === null ? null : integer(t.pityLimit)
        })),
        upItems: rows(pool.upItems).map(i => ({ itemName: text(i.itemName) })),
        pity: {
          freeRemaining: integer(pity.freeRemaining),
          upObtained: integer(pity.upObtained),
          tierPity: Object.fromEntries(Object.entries(record(pity.tierPity)).map(([key, value]) => [key, integer(value)]))
        },
        mainPityRemaining: pool.mainPityRemaining === null ? null : integer(pool.mainPityRemaining),
        subPityRemaining: pool.subPityRemaining === null ? null : integer(pool.subPityRemaining),
        upLimitReached: boolean(pool.upLimitReached)
      };
    })
  };
}

export async function getBackendLootboxes(bid: string | undefined, uid: number, page: number) {
  return parseBackendLootboxes(await requestBackend(identity(bid), 'get_players_id_lootboxes', { path: { id: uid }, query: { page } }));
}

export function parseBackendLootboxes(value: unknown) {
  const data = record(value);

  const capabilities = (value: unknown) => rows(value).map(capability => {
      if (capability.kind !== 'open' || typeof capability.valid !== 'boolean') {
        throw new Error('礼盒接口返回未知能力');
      }

      return {
        kind: 'open' as const,
        valid: capability.valid,
        options: rows(capability.options).map(option => {
          const requestedCount = integer(option.requestedCount);
          const effectiveCount = integer(option.effectiveCount);

          if (requestedCount <= 0 || effectiveCount <= 0) {
            throw new Error('礼盒接口能力选项无效');
          }

          return { requestedCount, effectiveCount };
        })
      };
    });

  return {
    page: integer(data.page),
    total: integer(data.total),
    pageSize: integer(data.pageSize),
    items: rows(data.items).map(item => ({
      id: integer(item.id),
      lootboxId: integer(item.lootboxId),
      quantity: integer(item.quantity),
      name: item.name === null ? '未知礼盒' : text(item.name),
      description: item.description === null ? '' : text(item.description),
      capabilities: capabilities(item.capabilities)
    }))
  };
}

export async function getBackendSoulArtifactBag(bid: string | undefined, uid: number, page: number) {
  return parseSoulArtifactBag(await requestBackend(identity(bid), 'get_players_id_soul_artifacts_bag', { path: { id: uid }, query: { page } }));
}

export function parseSoulArtifactBag(value: unknown) {
  const data = record(value);

  const lockAction = (value: unknown): 'lock' | 'unlock' | '' => {
    if (value !== 'lock' && value !== 'unlock' && value !== '') {
      throw new Error('本命物背包接口返回未知锁定动作');
    }

    return value;
  };

  return {
    page: integer(data.page),
    total: integer(data.total),
    pageSize: integer(data.pageSize),
    items: rows(data.items).map(item => ({
      id: integer(item.id),
      userSoulArtifactId: integer(item.id),
      artifactId: integer(item.artifactId),
      gradeId: integer(item.gradeId),
      name: item.name === null ? '未知本命物' : text(item.name),
      gradeName: item.gradeName === null ? '未知' : text(item.gradeName),
      level: integer(item.level),
      washCount: integer(item.washCount),
      hasUpgraded: integer(item.hasUpgraded) === 1,
      isEquipped: integer(item.isEquipped) === 1,
      isLocked: integer(item.isLocked),
      canRefine: boolean(item.canRefine),
      canToggleLock: boolean(item.canToggleLock),
      lockAction: lockAction(item.lockAction)
    }))
  };
}

function teamBattleRecord(data: Record<string, unknown>) {
  return {
    id: integer(data.id),
    teamId: integer(data.teamId),
    leaderUserId: integer(data.leaderUserId),
    battleMode: text(data.battleMode),
    targetLabel: text(data.targetLabel),
    battleResult: text(data.battleResult),
    participantCount: integer(data.participantCount),
    battleLogId: data.battleLogId === null ? null : text(data.battleLogId) || null,
    settledAt: date(data.settledAt)
  };
}

export async function getBackendTeamBattleRecords(bid: string | undefined, page: number, pageSize: number) {
  const data = record(await requestBackend(identity(bid), 'get_teams_battle_records', { query: { page, pageSize } }));

  return parseBackendTeamBattleRecords(data);
}

export function parseBackendTeamBattleRecords(value: unknown) {
  const data = record(value);

  return {
    currentPage: integer(data.page),
    total: integer(data.total),
    totalPages: integer(data.totalPages),
    records: rows(data.items).map(teamBattleRecord)
  };
}

export async function getBackendTeamBattleDetail(bid: string | undefined, recordId: number) {
  const data = record(await requestBackend(identity(bid), 'get_teams_battle_records_recordId', { path: { recordId } }));

  return parseBackendTeamBattleDetail(data, recordId);
}

export function parseBackendTeamBattleDetail(value: unknown, recordId: number) {
  const data = record(value);
  const detail = teamBattleRecord(data);

  if (detail.id !== recordId) {
    throw new Error('战报详情返回对象不一致');
  }

  return {
    ...detail,
    members: rows(data.members).map(member => {
      const isLeader = boolean(member.isLeader, '战报接口缺少队长标记');

      return {
        userId: integer(member.userId),
        userName: text(member.userName),
        isLeader,
        position: integer(member.position),
        rewardSnapshot: member.rewardSnapshot === null || member.rewardSnapshot === undefined ? null : record(member.rewardSnapshot)
      };
    })
  };
}

export async function getBackendTeamPendingApplications(bid: string | undefined, uid: number) {
  const data = record(await requestBackend(identity(bid), 'get_players_id_team_pending_applications', { path: { id: uid } }));

  return parseBackendTeamPendingApplications(data);
}

export function parseBackendTeamPendingApplications(value: unknown) {
  const data = record(value);

  return {
    leaderName: data.leaderName === null ? '未知' : text(data.leaderName),
    applications: rows(data.applications).map(item => ({
      id: integer(item.id),
      userId: integer(item.userId),
      teamId: integer(item.teamId),
      userName: item.userName === null ? '未知' : text(item.userName)
    }))
  };
}

export async function getBackendTeamApplicationRecords(bid: string | undefined, uid: number) {
  const data = record(await requestBackend(identity(bid), 'get_players_id_team_application_records', { path: { id: uid } }));

  if (typeof data.isLeader !== 'boolean' || typeof data.canUseSecondLayerFeature !== 'boolean') {
    throw new Error('申请接口缺少身份或境界资格');
  }

  return {
    isLeader: data.isLeader,
    canUseSecondLayerFeature: data.canUseSecondLayerFeature,
    realmName: text(data.realmName),
    applications: rows(data.applications).map(item => ({
      id: integer(item.id),
      leaderName: item.leaderName === null ? '未知' : text(item.leaderName),
      createdAt: date(item.createdAt)
    }))
  };
}

export async function getBackendProfessionToolBag(bid: string | undefined, uid: number, typeName?: string, page = 1) {
  return parseProfessionToolBag(await requestBackend(identity(bid), 'get_players_id_profession_tools_bag', { path: { id: uid }, query: { typeName, page } }));
}

export function parseProfessionToolBag(value: unknown) {
  const data = record(value);

  if (!Array.isArray(data.types)) {
    throw new Error('天工接口缺少分类');
  }

  const capability = (value: unknown) => {
    if (value !== 'replace' && value !== 'lock' && value !== 'unlock' && value !== 'viewDetail' && value !== 'lockAll' && value !== 'unlockAll') {
      throw new Error('天工接口返回未知能力');
    }

    return value;
  };

  if (!Array.isArray(data.capabilities)) {
    throw new Error('天工接口缺少页面能力');
  }

  return {
    types: data.types.map(text),
    activeType: data.activeType === null ? null : text(data.activeType),
    page: integer(data.page),
    total: integer(data.total),
    pageSize: integer(data.pageSize),
    totalPages: integer(data.totalPages),
    capabilities: data.capabilities.map(capability),
    items: rows(data.items).map(item => {
      if (typeof item.displayName !== 'string' || typeof item.displayGrade !== 'string' || !Array.isArray(item.capabilities)) {
        throw new Error('天工接口缺少物品投影');
      }

      return {
        id: integer(item.id),
        toolId: integer(item.toolId),
        name: item.displayName,
        typeName: item.typeName === null ? '未知' : text(item.typeName),
        grade: item.displayGrade,
        gradeId: item.gradeId === null ? 0 : integer(item.gradeId),
        isEquipped: integer(item.isEquipped),
        isLocked: integer(item.isLocked),
        canReplace: boolean(item.canReplace),
        canToggleLock: boolean(item.canToggleLock),
        capabilities: item.capabilities.map(capability)
      };
    })
  };
}

export async function getBackendSkillBookBag(bid: string | undefined, uid: number, skillType: string | null, page: number) {
  return parseSkillBookBag(
    await requestBackend(identity(bid), 'get_players_id_skill_books_bag', {
      path: { id: uid },
      query: { view: 'storage', skillType: skillType ?? undefined, page }
    })
  );
}

export function parseRobotStorageSkillBooks(value: unknown) {
  const data = record(value);

  return { ...parseSkillBookBag(data.bag), requestedType: text(data.requestedType) };
}

export function parseSkillBookBag(value: unknown) {
  const data = record(value);

  if (!Array.isArray(data.items) || !Array.isArray(data.capabilities)) {
    throw new Error('功法背包接口返回不完整');
  }
  const capability = (value: unknown) => {
    const row = record(value);
    const kinds = ['lock', 'unlock', 'learn', 'decompose', 'viewDetail', 'lockAll', 'unlockAll', 'decomposeAll'] as const;

    if (!kinds.includes(row.kind as (typeof kinds)[number])) {
      throw new Error('功法背包接口返回未知能力');
    }
    const kind = row.kind as (typeof kinds)[number];
    const requiresSkillType = kind === 'lockAll' || kind === 'unlockAll';

    if (requiresSkillType && (typeof row.skillType !== 'string' || !row.skillType)) {
      throw new Error('功法背包批量能力缺少分类');
    }

    return {
      kind,
      ...(requiresSkillType ? { skillType: row.skillType as string } : {})
    };
  };

  return {
    skillType: text(data.skillType),
    page: integer(data.page),
    total: integer(data.total),
    totalPages: integer(data.totalPages),
    items: data.items.map(value => {
      const item = record(value);

      if (!Array.isArray(item.capabilities)) {
        throw new Error('功法背包接口缺少物品能力');
      }
      if (
        typeof item.displayName !== 'string' ||
        typeof item.displayGrade !== 'string' ||
        typeof item.displaySkillType !== 'string' ||
        typeof item.unidentified !== 'boolean' ||
        !Array.isArray(item.attributeParts) ||
        !item.attributeParts.every(part => typeof part === 'string')
      ) {
        throw new Error('功法背包接口缺少展示投影');
      }

      return {
        id: integer(item.id),
        skillBookId: integer(item.skillBookId),
        status: integer(item.status),
        isLocked: integer(item.isLocked),
        quantity: integer(item.quantity),
        identifiableCount: integer(item.identifiableCount),
        displayName: item.displayName,
        displayGrade: item.displayGrade,
        displaySkillType: item.displaySkillType,
        unidentified: item.unidentified,
        attributeParts: item.attributeParts,
        physicalAttack: integer(item.physicalAttack),
        magicAttack: integer(item.magicAttack),
        physicalDefense: integer(item.physicalDefense),
        magicDefense: integer(item.magicDefense),
        hp: integer(item.hp),
        physicalAttackPercent: number(item.physicalAttackPercent),
        magicAttackPercent: number(item.magicAttackPercent),
        physicalDefensePercent: number(item.physicalDefensePercent),
        magicDefensePercent: number(item.magicDefensePercent),
        hpPercent: number(item.hpPercent),
        speed: integer(item.speed),
        critRate: number(item.critRate),
        critDamage: number(item.critDamage),
        maxPhysicalAttack: integer(item.maxPhysicalAttack),
        maxMagicAttack: integer(item.maxMagicAttack),
        maxPhysicalDefense: integer(item.maxPhysicalDefense),
        maxMagicDefense: integer(item.maxMagicDefense),
        maxHp: integer(item.maxHp),
        maxPhysicalAttackPercent: number(item.maxPhysicalAttackPercent),
        maxMagicAttackPercent: number(item.maxMagicAttackPercent),
        maxPhysicalDefensePercent: number(item.maxPhysicalDefensePercent),
        maxMagicDefensePercent: number(item.maxMagicDefensePercent),
        maxHpPercent: number(item.maxHpPercent),
        maxSpeed: integer(item.maxSpeed),
        maxCritRate: number(item.maxCritRate),
        maxCritDamage: number(item.maxCritDamage),
        name: item.name === null ? null : text(item.name),
        gradeId: item.gradeId === null ? null : integer(item.gradeId),
        grade: item.grade === null ? '未知' : text(item.grade),
        realm: item.realm === null ? null : text(item.realm),
        skillType: item.skillType === null ? '未知' : text(item.skillType),
        capabilities: item.capabilities.map(capability)
      };
    }),
    capabilities: data.capabilities.map(capability)
  };
}

export async function getBackendEquipmentBag(bid: string | undefined, uid: number, equipmentType: string | null, page: number) {
  return parseEquipmentBag(
    await requestBackend(identity(bid), 'get_players_id_equipment_bag', {
      path: { id: uid },
      query: { view: 'storage', equipmentType: equipmentType ?? undefined, page }
    })
  );
}

export function parseRobotStorageEquipment(value: unknown) {
  const data = record(value);

  return { ...parseEquipmentBag(data.bag), requestedType: text(data.requestedType) };
}

export function parseEquipmentBag(value: unknown) {
  const data = record(value);

  if (!Array.isArray(data.types)) {
    throw new Error('装备接口缺少分类');
  }

  const capability = (row: Record<string, unknown>) => {
    const kinds = ['equip', 'lock', 'unlock', 'decompose', 'viewDetail', 'lockAll', 'unlockAll', 'decomposeAll'] as const;

    if (!kinds.includes(row.kind as (typeof kinds)[number])) {
      throw new Error('装备接口返回未知能力');
    }
    if ((row.kind === 'lockAll' || row.kind === 'unlockAll') && (typeof row.equipmentType !== 'string' || !row.equipmentType)) {
      throw new Error('装备接口批量能力缺少分类');
    }
    if (row.equipmentType !== undefined && typeof row.equipmentType !== 'string') {
      throw new Error('装备接口能力分类无效');
    }

    return row.equipmentType === undefined
      ? { kind: row.kind as (typeof kinds)[number] }
      : { kind: row.kind as (typeof kinds)[number], equipmentType: row.equipmentType };
  };

  const capabilities = (value: unknown) => rows(value).map(capability);

  return {
    types: data.types.map(text),
    activeType: data.activeType === null ? null : text(data.activeType),
    page: integer(data.page),
    total: integer(data.total),
    totalPages: integer(data.totalPages),
    capabilities: capabilities(data.capabilities),
    items: rows(data.items).map(item => {
      if (
        typeof item.displayName !== 'string' ||
        typeof item.displayEquipmentType !== 'string' ||
        typeof item.displayGrade !== 'string' ||
        !Array.isArray(item.attributeParts) ||
        !item.attributeParts.every(part => typeof part === 'string')
      ) {
        throw new Error('装备背包接口缺少展示投影');
      }

      return {
        id: integer(item.id),
        equipmentId: integer(item.equipmentId),
        isEquipped: integer(item.isEquipped),
        isLocked: integer(item.isLocked),
        name: item.name === null ? '未知装备' : text(item.name),
        equipmentType: item.equipmentType === null ? '未知' : text(item.equipmentType),
        grade: item.grade === null ? '未知' : text(item.grade),
        physicalAttack: integer(item.physicalAttack),
        magicAttack: integer(item.magicAttack),
        physicalDefense: integer(item.physicalDefense),
        magicDefense: integer(item.magicDefense),
        hp: integer(item.hp),
        physicalAttackPercent: number(item.physicalAttackPercent),
        magicAttackPercent: number(item.magicAttackPercent),
        physicalDefensePercent: number(item.physicalDefensePercent),
        magicDefensePercent: number(item.magicDefensePercent),
        hpPercent: number(item.hpPercent),
        speed: integer(item.speed),
        critRate: number(item.critRate),
        critDamage: number(item.critDamage),
        canEquip: boolean(item.canEquip, '装备接口缺少装备资格字段'),
        canLock: boolean(item.canLock, '装备接口缺少锁定资格字段'),
        canDecompose: boolean(item.canDecompose, '装备接口缺少分解资格字段'),
        capabilities: capabilities(item.capabilities),
        displayName: item.displayName,
        displayEquipmentType: item.displayEquipmentType,
        displayGrade: item.displayGrade,
        attributeParts: item.attributeParts
      };
    })
  };
}

export async function getBackendMarketTrades(bid: string | undefined, uid: number, mode: 'all' | 'buy' | 'sell', page: number, pageSize: number) {
  return parseBackendMarketTrades(await requestBackend(identity(bid), 'get_players_id_market_trades', { path: { id: uid }, query: { mode, page, pageSize } }));
}

export function parseBackendMarketTrades(value: unknown) {
  const data = record(value);

  return {
    total: integer(data.total),
    currentPage: integer(data.currentPage),
    totalPages: integer(data.totalPages),
    rows: rows(data.items).map(item => {
      const sellerExists = boolean(item.sellerExists, '交易记录缺少卖家关联状态');
      const sellerName = text(item.sellerName);
      const role = item.role;

      if (role !== 'buy' && role !== 'sell') {
        throw new Error('交易记录缺少交易角色');
      }

      return {
        id: integer(item.id),
        listingId: integer(item.listingId),
        role,
        sellerUserId: integer(item.sellerUserId),
        seller: sellerExists ? { name: sellerName } : null,
        itemCategory: text(item.itemCategory),
        itemCategoryLabel: text(item.itemCategoryLabel),
        itemName: text(item.itemName),
        quantity: integer(item.quantity),
        unitPriceAmount: integer(item.unitPriceAmount),
        totalPriceAmount: integer(item.totalPriceAmount),
        currencyCode: text(item.currencyCode),
        currencyName: text(item.currencyName),
        displayQuantity: integer(item.displayQuantity),
        displayUnitPrice: integer(item.displayUnitPrice),
        displayTotalPrice: integer(item.displayTotalPrice),
        displayFee: integer(item.displayFee),
        displaySellerReceive: integer(item.displaySellerReceive),
        feeAmount: integer(item.feeAmount),
        sellerReceivedAmount: integer(item.sellerReceivedAmount),
        created_at: date(item.createdAt)
      };
    })
  };
}

export function parseBackendDungeonDetail(value: unknown) {
  const data = record(value);
  const parseDrop = (value: unknown) => rows(value).map(drop => ({
      category: text(drop.category),
      itemId: integer(drop.itemId),
      name: text(drop.name),
      amount: integer(drop.amount),
      probability: integer(drop.probability)
    }));
  const firstClear = data.firstClearReward === null ? null : record(data.firstClearReward);

  const rewardParts = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
      throw new Error('秘境首通奖励缺少列表');
    }

    return value.map(text);
  };
  const reward = firstClear === null ? null : { parts: rewardParts(firstClear.parts) };

  return {
    id: integer(data.id),
    name: text(data.name),
    isSingle: boolean(data.isSingle, '秘境接口缺少单人状态'),
    typeLabel: text(data.typeLabel),
    realmLimit: text(data.realmLimit),
    spiritCost: integer(data.spiritCost),
    guildContributionCost: integer(data.guildContributionCost),
    minPlayers: integer(data.minPlayers),
    usedToday: integer(data.usedToday),
    dailyLimit: integer(data.dailyLimit),
    freeUsed: integer(data.freeUsed),
    freeLimit: integer(data.freeLimit),
    freeRemaining: data.freeRemaining === undefined ? Math.max(0, integer(data.freeLimit) - integer(data.freeUsed)) : integer(data.freeRemaining),
    expReward: integer(data.expReward),
    currencyDrops: rows(data.currencyDrops).map(x => ({ code: text(x.code), name: text(x.name), amount: integer(x.amount) })),
    skillDrops: parseDrop(data.skillDrops),
    materialDrops: parseDrop(data.materialDrops),
    hasCleared: boolean(data.hasCleared, '秘境接口缺少通关状态'),
    firstClearReward: reward,
    outputMultiplier: data.outputMultiplier === null ? null : number(data.outputMultiplier),
    outputAddPct: data.outputAddPct === null ? null : number(data.outputAddPct),
    inTeam: boolean(data.inTeam, '秘境接口缺少队伍状态')
  };
}

export async function getBackendDungeonCatalog(bid: string | undefined, uid: number, page: number) {
  return parseBackendDungeonCatalog(
    await requestBackend(identity(bid), 'get_players_id_dungeons_catalog', { path: { id: uid }, query: { page, pageSize: 5 } })
  );
}

export function parseBackendDungeonCatalog(value: unknown) {
  const data = record(value);

  const inTeam = boolean(data.inTeam, '秘境接口缺少队伍状态');

  return {
    mentalValue: integer(data.mentalValue),
    inTeam,
    realmLevel: integer(data.realmLevel),
    realmStageLevel: integer(data.realmStageLevel),
    canUseMeridian: boolean(data.canUseMeridian, '秘境接口缺少经脉资格'),
    canMatchDungeon: boolean(data.canMatchDungeon, '秘境接口缺少匹配资格'),
    pagination: { currentPage: integer(data.currentPage), totalPages: integer(data.totalPages), total: integer(data.total) },
    items: rows(data.items).map(item => {
      const isSingle = boolean(item.isSingle, '秘境接口缺少挑战状态');
      const hasCleared = boolean(item.hasCleared, '秘境接口缺少挑战状态');

      return {
        id: integer(item.id),
        name: text(item.name),
        isSingle,
        hasCleared,
        spiritCost: integer(item.spiritCost),
        freeLimit: item.freeLimit === undefined ? null : integer(item.freeLimit),
        freeRemaining: item.freeRemaining === undefined ? null : integer(item.freeRemaining),
        minRealmName: item.minRealmName === null ? null : text(item.minRealmName),
        maxRealmName: item.maxRealmName === null ? null : text(item.maxRealmName)
      };
    })
  };
}

export async function getBackendGuildStorylineRecords(bid: string | undefined, uid: number) {
  return parseGuildStorylineRecords(await requestBackend(identity(bid), 'get_players_id_guild_storyline_records', { path: { id: uid } }));
}

export function parseGuildStorylineRecords(value: unknown) {
  const data = record(value);

  return {
    guildName: text(data.guildName),
    guildLevel: integer(data.guildLevel),
    records: rows(data.records).map(row => {
      const isEffective = boolean(row.isEffective, '宗门主线记录缺少有效状态');

      return {
        stageIndex: integer(row.stageIndex),
        damageDealt: integer(row.damageDealt),
        participationPoint: integer(row.participationPoint),
        battleResult: integer(row.battleResult),
        isEffective,
        attemptNo: integer(row.attemptNo)
      };
    })
  };
}

function feedbackRow(item: Record<string, unknown>) {
  const isReplied = boolean(item.isReplied, '反馈接口缺少回复状态');

  return { id: integer(item.id), content: text(item.content), isReplied, feedbackTime: date(item.feedbackTime) };
}
export async function getBackendFeedbacks(bid: string | undefined, page: number) {
  return parseBackendFeedbacks(await requestBackend(identity(bid), 'get_feedback_mine', { query: { page, pageSize: 5 } }));
}
export function parseBackendFeedbacks(value: unknown) {
  const data = record(value);
  const total = integer(data.total);
  const pageSize = integer(data.pageSize);

  if (pageSize !== 5) {
    throw new Error('反馈接口分页大小不一致');
  }

  return { feedbacks: rows(data.items).map(feedbackRow), total, currentPage: integer(data.page), totalPages: Math.ceil(total / pageSize) };
}
export async function getBackendFeedbackDetail(bid: string | undefined, feedbackId: number) {
  return parseBackendFeedbackDetail(await requestBackend(identity(bid), 'get_feedback_feedbackId', { path: { feedbackId } }), feedbackId);
}
export function parseBackendFeedbackDetail(value: unknown, feedbackId: number) {
  const data = record(value);
  const detail = feedbackRow(data);

  if (detail.id !== feedbackId) {
    throw new Error('反馈详情返回对象不一致');
  }

  return {
    ...detail,
    reply: data.reply === null ? null : text(data.reply),
    'category.name': data.categoryName === null ? null : text(data.categoryName)
  };
}

export async function getBackendEnemies(bid: string | undefined, uid: number) {
  return parseBackendEnemies(await requestBackend(identity(bid), 'get_players_id_robbery_enemies', { path: { id: uid } }));
}

export function parseBackendEnemies(value: unknown) {
  return rows(value).map(item => {
    const attackerId = integer(item.uid);

    return {
      uid: attackerId,
      name: item.name === null ? `玩家${attackerId}` : text(item.name),
      totalAttacks: integer(item.totalAttacks),
      lastAttackTime: date(item.lastAttackTime),
      lastLogId: integer(item.lastLogId),
      ...(item.reports !== undefined ? { reports: rows(item.reports).map(parseRobberyRecord) } : {})
    };
  });
}

export async function getBackendGuildMembers(bid: string | undefined, uid: number, page: number, pageSize: number) {
  return parseGuildMembers(await requestBackend(identity(bid), 'get_players_id_guild_members', { path: { id: uid }, query: { page, pageSize } }));
}

export function parseGuildMembers(value: unknown) {
  const data = record(value);
  const status = text(data.membershipStatus);

  if (!['not_joined', 'guild_missing', 'members_missing', 'joined'].includes(status)) {
    throw new Error('宗门成员接口状态无效');
  }

  return {
    membershipStatus: status,
    guildName: text(data.guildName),
    page: integer(data.page),
    pageSize: integer(data.pageSize),
    total: integer(data.total),
    totalPages: integer(data.totalPages),
    members: rows(data.members).map(item => {
      const isOnLeave = boolean(item.isOnLeave, '宗门成员接口缺少职位状态');
      const isDeputy = boolean(item.isDeputy, '宗门成员接口缺少职位状态');

      const name = item.name === null ? null : text(item.name);
      const realmName = item.realmName === null ? null : text(item.realmName);

      return {
        userId: integer(item.userId),
        roleId: integer(item.roleId),
        roleName: item.roleName === null ? '弟子' : text(item.roleName),
        userName: name === null ? '未知' : `${name}（${realmName ?? '未知'}）`,
        dailyActivity: integer(item.dailyActivity),
        weeklyActivity: integer(item.weeklyActivity),
        contributionTotal: integer(item.contributionTotal),
        isOnLeave,
        isDeputy,
        leaveEndAt: item.leaveEndAt === null ? undefined : date(item.leaveEndAt)
      };
    })
  };
}
