import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
import { commonQueryActions } from '../../src/expose/common-queries';

after(() => shutdownLogger());
const backend = { api_url: 'https://offline.invalid', robot_auth_token: 'offline' };
const boss = { stageLevel: 1, stageName: '炼气', activeTimeDesc: '每日', bossStatus: 'UNAVAILABLE', canChallenge: false, rewardPendingUntilEnd: true, config: { bossName: '凶兽', bossTitle: '凶兽', baseHp: 1000, dailyAttempts: 3, maxRounds: 10, activeStartHour: 10, activeEndHour: 12 }, isActive: false, hasInstance: false, totalDamage: 0, totalAttacks: 0, playerDamage: 0, playerAttacks: 0, remainingAttempts: 3, playerRank: null, claimableRewardCount: 0 };
const chapters = { mentalValue: 12.5, canUseMeridian: false, canUseSecondLayerFeature: false, inTeam: false, detail: null, overview: { chapters: [{ name: '山门', arc: '初入仙途', chapterNumber: 1, totalStars: 2, maxStars: 9, clearedCount: 1, stageCount: 3, claimableChestCount: 0, starsText: '2/9', progressText: '1/3', chestIcon: '' }], totalClaimableChests: 0, currentPage: 2, totalPages: 2, totalCount: 6, milestoneTotalStars: 2, milestoneTotal: 3, milestoneClaimed: 0, milestoneClaimable: 0, achievementLabel: '', showClaimAllChests: false } };
const detail = { ...chapters, overview: null, detail: { status: 'LOCKED', statusMessage: '未开放', chapterNumber: 2, chapterName: '下一章', arc: '初入仙途', totalStars: 0, maxStars: 9, canClaimChestCount: 0, maxChapterNumber: 2, eliteStagesCleared: false, showPrevChapter: true, showNextChapter: false, chests: [], stages: [] } };
const cases: { action: string; path: string; input?: Record<string, unknown>; data: unknown; check: (data: any) => void }[] = [
  { action: 'get_realm', path: 'realm/overview', data: { playerId: 7, experience: 120, realm: { id: 1, name: '炼气一层', level: 1, stageLevel: 1, experienceLimit: 100 }, breakthrough: { currentRealm: { id: 1, name: '炼气一层', level: 1, stageLevel: 1, experienceLimit: 100 }, nextRealm: null, experience: 120, requiredExp: 100, materials: null, canBreak: false, message: '暂无下一层' }, promotion: { currentRealm: { id: 1, name: '炼气一层', level: 1, stageLevel: 1, experienceLimit: 100 }, nextRealm: null, stageLevel: 1, experience: 120, requiredExp: 100, materials: [], canPromote: false, hasTribulation: false, message: '未满足条件' } }, check: d => { assert.equal(d.breakthrough.canBreak, false); assert.equal(d.playerId, 7); assert.equal('nextRealm' in d.breakthrough, false); } },
  { action: 'get_spirit_root', path: 'spirit-root', data: { granted: false, canFeed: false, canPromote: false, meditationActive: false, title: '', qualityName: '', nextQualityName: '', requiredRealmName: '', message: '未获得', quality: 0, cultivation: 0, stagePoints: 0, stageTarget: 0, overflow: 0, bonusPercent: 0, nextBonusPercent: 0, activeMeditationBonusPercent: 0 }, check: d => { assert.equal(d.granted, false); assert.equal(d.message, '未获得'); } },
  { action: 'get_spirit_root_materials', path: 'spirit-root/materials', data: [{ itemId: 5, points: 10, quantity: 2, name: '灵药', seedName: '种子', locked: true, seedAvailable: false, sources: ['秘境'], sourceDetails: [{ dungeonId: 1, name: '秘境', realmLimit: '炼气' }], seedSources: [] }], check: d => { assert.equal(d[0].quantity, 2); assert.equal(d[0].locked, true); assert.equal(d[0].seedAvailable, false); } },
  { action: 'get_world_boss', path: 'world-boss/info-query', data: boss, check: d => { assert.equal(d.remainingAttempts, '3'); assert.equal('playerRank' in d, false); assert.equal(d.canChallenge, false); } },
  { action: 'get_storyline_chapters', path: 'storyline/catalog', input: { page: 2 }, data: chapters, check: d => { assert.equal(d.overview.currentPage, 2); assert.equal(d.mentalValue, 12.5); assert.equal(d.overview.chapters[0].name, '山门'); } },
  { action: 'get_storyline_chapter', path: 'storyline/catalog', input: { chapterNumber: 2 }, data: detail, check: d => assert.equal(d.detail.status, 'LOCKED') },
  { action: 'get_guild', path: 'guild/home', data: { hasGuild: false, access: { canCreateOrApplyGuild: false }, membership: null, guild: null, unlockLevels: { shop: null, viceLeader: null, elder: null }, pendingApplications: 0, storyline: { initialized: false, allCleared: false, stageIndex: null } }, check: d => { assert.equal(d.hasGuild, false); assert.equal('guild' in d, false); } },
  { action: 'get_tasks', path: 'task-panel/view', data: { defaultTabKey: 'checkin', tabs: ['checkin','activity','cultivation','dungeon','guild','event','auto'].map(tabKey => ({ tabKey, tabName: tabKey, visible: true, hasActionable: tabKey === 'checkin', items: tabKey === 'checkin' ? [{ label: '签到', statusText: '可签到', status: 'ACTIONABLE', priority: 10, visible: true, command: '/签到' }] : [] })) }, check: d => assert.equal(d.tabs[0].items[0].status, 'ACTIONABLE') },
  { action: 'get_cave', path: 'cave/view', data: { plots: [], maxPlots: 4, cultivatedCount: 0, plantedCount: 0, matureCount: 0, abnormalCount: 0, auraScore: 0, auraLevel: '平常', auraLabel: '平常', activeFormations: [], stasisFormation: null }, check: d => assert.deepEqual(d.plots, []) },
  { action: 'get_equipped', path: 'equipment/equipped', data: { playerName: null, canUseFifthLayerFeature: false, types: [{ id: 1, name: '武器' }], items: [], slots: [{ type: { id: 1, name: '武器' }, item: null }], sets: [] }, check: d => { assert.equal(d.slots[0].type.name, '武器'); assert.equal('item' in d.slots[0], false); } },
  { action: 'get_learned_books', path: 'skill-books/learned', input: { visibility: 'hidden', page: 2 }, data: { items: [], inUseBooks: [], pageSize: 5, total: 0, totalPages: 0, currentPage: 2, proficiencyPoints: 5, canUseFifthLayerFeature: false }, check: d => { assert.equal(d.currentPage, 2); assert.equal(d.proficiencyPoints, 5); } },
  { action: 'get_dungeons', path: 'dungeons/catalog', input: { page: 2 }, data: { mentalValue: 10, inTeam: false, realmLevel: 1, realmStageLevel: 1, canUseMeridian: false, canMatchDungeon: false, currentPage: 2, totalPages: 2, total: 6, items: [{ id: 1, name: '秘境', isSingle: true, hasCleared: false, spiritCost: 2, freeLimit: 1, freeRemaining: 1, minRealmName: null, maxRealmName: null }] }, check: d => assert.equal(d.items[0].freeRemaining, 1) },
  { action: 'get_emails', path: 'emails', data: { total: 1, hasClaimable: true, hasDeletable: false, list: [{ id: 7, name: '奖励', subtitle: '', data: '未领取', goods: [{ itemId: 4, name: '灵草', category: 'material', quantity: 2 }], state: 0, canClaim: true, canDelete: false }] }, check: d => { assert.equal(d.list[0]['email.id'], 7); assert.equal(d.list[0]['email.goods'][0].quantity, 2); } },
  { action: 'get_checkin_status', path: 'check-ins/status', data: { asOf: '2026-10-27', daily: { available: true, signed: false, accumulatedDays: 2 }, newcomer: { eligible: false, available: false, signed: false, accumulatedDays: 0, expiresOn: '', expiresAt: '' }, guild: { joined: false, available: false, signed: false }, celestial: { available: false, signedSlotIds: [], availableSlotIds: [], enabledSlots: [], nextAvailableAt: null } }, check: d => assert.equal(d.daily.available, true) },
  { action: 'get_shop_products', path: 'shop/products', input: { shopCode: 'common', page: 2 }, data: { page: 2, totalPages: 2, total: 6, access: { visibleShopCodes: ['common'], deniedReason: null }, products: [{ productId: 5, quantity: 1, used: 0, limit: 3, remaining: 3, priceAmount: 50, secondaryPriceAmount: null, discountPriceAmount: null, shopCode: 'common', name: '丹药', category: 'prop', priceCurrencyCode: 'spiritStone', priceCurrencyName: '灵石', secondaryPriceCurrencyCode: null, secondaryPriceCurrencyName: null, limitPeriod: 'daily', limitPeriodName: '每日', lockReason: null, nextPurchaseAt: null, unlocked: true }] }, check: d => { assert.equal(d.products[0].priceAmount, 50); assert.equal(d.products[0].priceCurrencyCode, 'spiritStone'); } }
];
for (const entry of cases) {
  for (const broken of [false, true]) test(`${entry.action}: ${broken ? '拒绝损坏响应' : '真实 SDK 查询与结果语义'}`, async t => {
    const app = createTestApp({ config: { 'xiuxian-game': { backend } } });
    t.after(() => app.dispose());
    await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
    const paths: string[] = [];
    t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
      const url = new URL(request.url);
      paths.push(url.pathname);
      assert.equal(request.method, 'GET');
      assert.equal(request.headers['x-bid'], 'owner');
      assert.ok(request.signal instanceof AbortSignal);
      const identity = url.pathname === '/api/v1/robot/identity';
      if (!identity) {
        assert.equal(url.pathname, `/api/v1/players/7/${entry.path}`);
        for (const [key, value] of Object.entries(entry.input ?? {})) assert.equal(url.searchParams.get(key), String(value));
      }
      return { status: 200, headers: {}, data: JSON.stringify({ data: identity ? { bid: 'owner', account: { status: 'registered', playerId: 7 } } : broken ? {} : entry.data }) };
    } }));
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', entry.action, entry.input ?? {}), 'ai-plugin');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.messages, []);
    assert.equal(result.value.ok, !broken, JSON.stringify(result.value));
    assert.equal(paths.length, 2);
    if (result.value.ok) entry.check(result.value.data);
  });
}
for (const action of Object.keys(commonQueryActions)) test(`${action}: 关闭与身份参数不可绕过`, async t => {
  const app = createTestApp({ config: { 'xiuxian-game': { backend, expose: { enabled: false } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('unexpected HTTP'); });
  const input = action === 'get_storyline_chapter' ? { chapterNumber: 1 } : {};
  for (const spoof of [false, true]) {
    const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, { ...input, ...(spoof ? { uid: 999 } : {}) }), 'ai-plugin');
    assert.equal(result.value.ok, false);
    if (!result.value.ok) assert.equal(result.value.error.code, spoof ? 'INVALID_INPUT' : 'FORBIDDEN');
  }
});
