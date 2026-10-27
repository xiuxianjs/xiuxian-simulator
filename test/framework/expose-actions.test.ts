import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
import { setRobotTaskInput, hasPendingRobotTaskInput } from '../../src/api/bot/task-business-context';

after(() => shutdownLogger());
const summary = { slot: 2, name: '配装', equipmentCount: 1, equipmentNames: ['剑'], skillNames: { 战技: '剑诀' }, missingEquipmentCount: 0, missingSkillCount: 0 };
const equipment = { id: 3, name: '剑', equipmentType: '武器', grade: '凡', physicalAttack: 2, physicalAttackPercent: 1.5, magicAttack: 1, magicAttackPercent: 0, physicalDefense: 0, physicalDefensePercent: 0, magicDefense: 0, hp: 0, hpPercent: 0, speed: 1, critRate: 0.1, critDamage: 1.5 };
const bossRound = { damageDealt: 10, totalPlayerDamage: 30, attackCount: 1, remainingAttempts: 2, rank: null, logId: 'battle-1', stageName: '炼气', bossTitle: '凶兽', bossName: '兽', battle: { winner: 'A', totalRounds: 1, sideA: [], sideB: [] }, battleSummary: { sideACount: 1, sideBCount: 1, totalDamageA: 10, totalDamageB: 0, totalHealsA: 0, totalHealsB: 0 } };
const dungeonSweep = { dungeonName: '秘境', times: 1, totalSpiritCost: 0, totalExp: 20, currency: [{ category: 'currency', name: '灵石', amount: 5 }], items: [] };
const chapterChests = { success: true, message: '已领取', chapterNumber: 1, claimedIndexes: [1], totalReward: 10, chests: [{ index: 1, requiredStars: 3, reward: 10, claimed: true, unlocked: true }] };
const manualState = { sessionId: 'manual-1', revision: 2, finished: false, events: [], battle: { Winner: '', Rounds: 1, SideA: [], SideB: [] }, choice: { unitId: 'p', unitName: '修士', side: 'A', round: 1, availableSkills: [{ type: 'normal', name: '普攻', available: true }] } };
const caveCommand = { message: '操作完成', needsSeedSelection: false, overview: null, snapshotError: '快照暂不可用' };
const cases = [
  { action: 'cultivate_cave_plot', operation: 'cave.cultivate', command: '/开垦 1', input: { plotIndex: 1 }, args: { plotIndex: '1' }, data: caveCommand },
  { action: 'plant_cave_seed', operation: 'cave.plant', command: '/播种 1 灵种', input: { plotIndex: 1, seedName: '灵种' }, args: { plotIndex: '1', seedName: '灵种' }, data: { mode: 'plant', result: caveCommand } },
  { action: 'water_cave_plots', operation: 'cave.water', command: '/浇灌 1', input: { plotIndex: 1 }, args: { plotIndex: '1' }, data: { mode: 'command', result: caveCommand } },
  { action: 'remove_cave_worms', operation: 'cave.worm', command: '/除虫', input: {}, args: { plotIndex: null }, data: { mode: 'command', result: caveCommand } },
  { action: 'remove_cave_weeds', operation: 'cave.weed', command: '/除草', input: {}, args: { plotIndex: null }, data: { mode: 'command', result: caveCommand } },
  { action: 'harvest_cave_plots', operation: 'cave.harvest', command: '/收割', input: {}, args: { plotIndex: null }, data: { mode: 'command', result: caveCommand } },
  { action: 'tend_cave_plots', operation: 'cave.tend-all', command: '/一键打理灵田', input: {}, args: { harvest: false }, data: { message: '浇灌：1 项\n收割：暂不可用' } },
  { action: 'checkin_guild', operation: 'guild.checkin', command: '/宗门签到', input: {}, data: { message: '签到完成', receipt: { message: '已签到', guildId: 1, contributionAdded: 1, prestigeAdded: 2, dailyActivityAdded: 3, weeklyActivityAdded: 4, weeklyBonusSpiritStone: 0, weeklyCheckinCount: 1 } } },
  { action: 'mine_guild', operation: 'guild.mining', command: '/宗门采矿', input: {}, data: { message: '采矿进行中', receipt: { outcome: 'in_progress', message: '进行中', guildName: '宗门', guildId: 1, veinLevel: 1, miningQuota: 2, remainingSeconds: 100, settledHours: 0, spiritStoneAdded: 0, contributionAdded: 0, dailyActivityAdded: 0, started: false, capReached: false } } },
  { action: 'claim_guild_stipend', operation: 'guild.stipend-claim', command: '/领取宗门俸禄', input: {}, data: { message: '领取完成', receipt: { guildId: 1, amount: 123, weeklyActivity: 40, guildLevel: 2, baseAmount: 100, levelMultiplier: 1.2, activityMultiplier: 1.025 } } },
  { action: 'challenge_storyline', operation: 'storyline.challenge', command: '/主线挑战 1-1', input: { chapterNumber: 1, stageNumber: 1 }, args: { input: '/主线挑战 1-1' }, data: manualState },
  { action: 'choose_storyline_skill', operation: 'storyline.choice', command: '/normal', input: { sessionId: 'manual-1', expectedRevision: 1, choice: 'normal' }, data: { ...manualState, choiceAccepted: false } },
  { action: 'challenge_dungeon', operation: 'dungeon.challenge', command: '/秘境挑战 秘境', input: { dungeonName: '秘境' }, args: { mode: 'challenge', dungeonName: '秘境' }, data: { outcome: 'result', data: { dungeonId: 1, won: false, experienceGained: 0, spiritStoneGained: 0, battle: { winner: 'B', rounds: 2 }, drops: [], rewardsByUser: [{ userId: 7, eligible: false, noRewardReason: '未胜利', spiritCostPaid: 10, experienceGained: 0, currency: [], items: [] }] } } },
  { action: 'sweep_dungeon', operation: 'dungeon.sweep', command: '/扫荡秘境 秘境 1', input: { dungeonName: '秘境', times: 1 }, args: { mode: 'sweep', dungeonName: '秘境', times: 1 }, data: { outcome: 'result', data: dungeonSweep } },
  { action: 'sweep_free_dungeons', operation: 'dungeon.sweep-free', command: '/扫荡免费秘境', input: {}, data: { sweptDungeons: [dungeonSweep], skippedDungeons: [{ dungeonName: '另一个秘境', message: '已完成' }], totalTimes: 1, totalExp: 20, totalSpiritCost: 0 } },
  { action: 'sweep_storyline', operation: 'storyline.sweep', command: '/主线扫荡 1-1 5', input: { chapterNumber: 1, stageNumber: 1, times: 5 }, args: { input: '/主线扫荡 1-1 5' }, data: { chapterNumber: 1, stageNumber: 1, result: { stageLabel: '第一关', times: 5, totalSpiritCost: 5, totalExp: 100, totalSpiritStone: 10, totalBonusExp: -90, expBonusText: '封顶', allItemsGained: [] } } },
  { action: 'claim_storyline_chest', operation: 'storyline.chests-claim', command: '/领取宝箱 1 1', input: { chapterNumber: 1, chestIndex: 1 }, args: { input: '/领取宝箱 1 1' }, data: chapterChests },
  { action: 'claim_storyline_chapter_chests', operation: 'storyline.chests-claim', command: '/领取宝箱 1', input: { chapterNumber: 1 }, args: { input: '/领取宝箱 1' }, data: chapterChests },
  { action: 'claim_all_storyline_chests', operation: 'storyline.chests-claim-all', command: '/一键领取宝箱', input: {}, data: { success: true, message: '已领取', totalReward: 10, claimedCount: 1, details: [{ chapterNumber: 1, chapterName: '第一章', claimed: [1], reward: 10 }] } },
  { action: 'challenge_world_boss', operation: 'world-boss.challenge', command: '/挑战凶兽', input: {}, args: { mode: 'single' }, data: { outcome: 'result', mode: 'single', data: bossRound } },
  { action: 'challenge_world_boss_all', operation: 'world-boss.challenge', command: '/挑战凶兽 全部', input: {}, args: { mode: 'all' }, data: { outcome: 'result', mode: 'all', data: { rounds: [bossRound], attemptsUsed: 1, totalDamageDealt: 10, lastRound: bossRound, stageName: '炼气', bossTitle: '凶兽', bossName: '兽', remainingAttempts: 2, stopReason: '测试中止' } } },
  { action: 'claim_world_boss_rewards', operation: 'world-boss.reward-claim', command: '/领取凶兽奖励', input: {}, data: { items: [{ bossDate: '2026-10-01', stageLevel: 1, stageName: '炼气', tierName: '参与', spiritStone: 10, spiritCrystal: 1, playerDamage: 10 }], totalStone: 10, totalCrystal: 1 } },
  { action: 'reset_demon_tower', operation: 'demon-tower.reset', command: '/妖塔重置', input: {}, data: { success: true, message: '已重置', resetsUsed: 1, maxResets: 3 } },
  { action: 'sweep_demon_tower', operation: 'demon-tower.sweep', command: '/妖塔扫荡', input: {}, data: { layersSwept: 1, totalSpiritStone: 10, totalScore: 2, cumulativeStars: 3, milestonesTriggered: [], nextLayer: 2, buffsToSelect: 1, availableBuffs: [{ key: 'hp', label: '生命', cnKey: '生命' }] } },
  { action: 'select_demon_tower_buff', operation: 'demon-tower.buff', command: '/妖塔选buff hp 1', input: { buffKey: 'hp', count: 1 }, args: { selection: { buffKey: 'hp', count: 1 } }, data: { outcome: 'result', data: { count: 1, buffApplied: 'hp', newBuffs: { hp: 0.1, atk: 0, critDmg: 0 }, remainingBuffSelections: 0, buffOptions: [] } } },
  { action: 'challenge_demon_tower', operation: 'demon-tower.challenge', command: '/妖塔挑战 3', input: { stars: 3 }, data: { outcome: 'result', data: { success: false, starsEarned: 0, scoreEarned: 0, totalTowerScore: 5, spiritStoneEarned: 0, layerCleared: false, allCleared: false, nextLayer: 1, nextStage: 1, cumulativeStars: 0, needSelectBuff: false, condition: 'ROUND_LIMIT', conditionLabel: '回合', battleWinner: 'B', battleRounds: 5, milestonesTriggered: [], availableBuffs: [] } } },
  { action: 'equip_equipment', operation: 'equipment.equip', command: '/装备 3', input: { identifier: '3' }, data: { outcome: 'equipped', equipment } },
  { action: 'auto_equip_equipment', operation: 'equipment.auto-equip', command: '/一键装备', input: {}, data: { success: false, message: '部分可用', results: [{ typeName: '武器', equipped: false, reason: '无可用装备' }] } },
  { action: 'unequip_equipment', operation: 'equipment.unequip-one', command: '/卸下 武器', input: { equipmentTypeName: '武器' }, data: { outcome: 'unequipped', stage: 'cache_cleared', instanceId: 3 } },
  { action: 'unequip_skill_book', operation: 'skill-books.unequip', command: '/换下战技', input: { skillType: '战技' }, data: { outcome: 'unequipped', skillBook: { name: '剑诀', skillType: '战技' } } },
  { action: 'hide_skill_book', operation: 'skill-books.hide', command: '/隐藏功法 3', input: { bookId: 3 }, args: { bookId: '3' }, data: { code: 'UPDATED', bookId: 3, isHidden: true, name: '剑诀', message: '已隐藏' } },
  { action: 'show_skill_book', operation: 'skill-books.show', command: '/显示功法 3', input: { bookId: 3 }, args: { bookId: '3' }, data: { code: 'UPDATED', bookId: 3, isHidden: false, name: '剑诀', message: '已显示' } },
  { action: 'open_lootbox', operation: 'lootboxes.open', command: '/开启礼盒 礼盒 10', input: { lootboxName: '礼盒', openCount: 10 }, data: { lootboxName: '礼盒', openCount: 2, rewards: [{ category: 'currency', rewardId: 1, name: '灵石', quantity: 5 }] } },
  { action: 'get_meditation_boost_options', operation: 'meditation.boost-options', command: '/闭关加速', input: {}, data: { autoEnabled: true, enabled: true, pricePerInterval: 5, intervalMinutes: 15, spiritStone: 100, maxHours: 8, multiplier: 1.5 } },
  { action: 'breakthrough_realm', operation: 'realm.breakthrough', command: '/突破', input: {}, data: { newRealm: { name: '炼气', level: 2, spiritualPower: 2, speed: 2, magicAttack: 2, physicalAttack: 2, magicDefense: 2, physicalDefense: 2, experienceLimit: 100.5 }, message: '成功', unlockedRecipes: [], isNewStage: false, masterStageMessages: [] } },
  { action: 'save_battle_template', operation: 'battle-templates.save', command: '/保存战斗模板 2 配装', input: { slot: 2, name: '配装' }, args: { slotText: '2', name: '配装' }, data: { ...summary, created: false } },
  { action: 'apply_battle_template', operation: 'battle-templates.apply', command: '/应用战斗模板 2', input: { slot: 2 }, args: { slotText: '2', name: null }, data: { ...summary, cacheInvalidated: true } },
  { action: 'delete_battle_template', operation: 'battle-templates.delete', command: '/删除战斗模板 2', input: { slot: 2 }, args: { slotText: '2', name: null }, data: { deleted: false } },
  { action: 'checkin_daily', operation: 'checkin.daily', command: '/日常签到', input: {}, data: { accumulatedDays: 1, issued: [] } },
  { action: 'checkin_newcomer', operation: 'checkin.newcomer', command: '/新人签到', input: {}, data: { accumulatedDays: 1, expireDate: '2026-11-01', issued: [] } },
  { action: 'checkin_all', operation: 'checkin.hub', command: '/签到', input: {}, data: { results: [{ name: '日常', status: 'error', message: '未完成' }] } },
  { action: 'claim_email', operation: 'emails.claim', command: '/领取邮件 9', input: { emailId: 9 }, data: { emailId: 9, issued: [] } },
  { action: 'claim_all_emails', operation: 'emails.claim-all', command: '/一键领取邮件', input: {}, data: { claimed: 1, skipped: 2, total: 3 } }
];
for (const entry of cases) for (const mode of ['success', 'refused', 'malformed', 'disabled', 'spoof', 'missing-id', 'cancel'] as const) test(`${entry.action}: ${mode}`, async t => {
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' }, expose: { enabled: mode !== 'disabled' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const requests: any[] = [];
  const controller = new AbortController();
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests.push(request);
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${entry.operation}`);
    assert.equal(request.method, 'POST');
    assert.equal(request.headers['x-bid'], 'owner');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, entry.command);
    assert.deepEqual(body.arguments, entry.args ?? entry.input);
    assert.equal(body.taskInput, undefined);
    if (mode === 'cancel') return new Promise((_resolve, reject) => {
      request.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
      controller.abort();
    });
    const refused = mode === 'refused';
    const middleware = {
      outcome: refused ? 'reject' : 'allow', reason: refused ? 'MAINTENANCE' : 'ALLOWED',
      identity: { bid: 'owner', account: { status: 'registered', playerId: 7 } },
      replies: refused ? [{ title: '维护', heading: '', text: '稍后再试', buttons: [], advice: [] }] : [], contextWarnings: [],
      ...(!refused ? { entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } } : {})
    };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: !refused, branch: refused ? 'middleware' : 'business', middleware, ...(!refused ? { data: mode === 'malformed' ? {} : entry.data } : {}) } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' });
  if (mode === 'missing-id') Object.assign(event, { MessageId: '', InteractionId: '' });
  const originalText = event.MessageText;
  setRobotTaskInput(event, 'pending-task');
  const invoke = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', entry.action, mode === 'spoof' ? { ...entry.input, uid: 999 } : entry.input, { signal: controller.signal }), 'ai-plugin');
  const result = await invoke();
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
  assert.equal(event.MessageText, originalText);
  assert.equal(hasPendingRobotTaskInput(event), true);
  assert.equal(result.value.ok, mode === 'success' || mode === 'refused', JSON.stringify(result.value));
  if (result.value.ok) {
    const value = result.value.data as any;
    assert.equal(value.success, mode === 'success');
    if (mode === 'refused') { assert.equal(value.result, undefined); assert.equal(value.replies[0].text, '稍后再试'); }
    if (mode === 'success') {
      const again = await invoke();
      assert.deepEqual(again.value.ok && again.value.data, value);
      assert.equal(requests.length, 2);
      assert.ok(requests[0].headers['idempotency-key']);
      assert.equal(requests[0].headers['idempotency-key'], requests[1].headers['idempotency-key']);
      if (entry.action === 'checkin_all') assert.equal(value.result[0].status, 'error');
    }
  } else {
    assert.equal(requests.length, ['disabled', 'spoof', 'missing-id'].includes(mode) ? 0 : 1);
    assert.equal(result.value.error.outcome, ['disabled', 'spoof', 'missing-id'].includes(mode) ? 'not_started' : 'unknown');
  }
});

test('写操作幂等键区分原消息、玩家和参数，参数顺序不改变重试键', async t => {
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    keys.push(request.headers['idempotency-key']);
    const args = (typeof request.data === 'string' ? JSON.parse(request.data) : request.data).arguments;
    const middleware = { outcome: 'allow', reason: 'ALLOWED', identity: { bid: request.headers['x-bid'], account: { status: 'registered', playerId: 7 } }, replies: [], contextWarnings: [], entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'business', middleware, data: { ...summary, slot: Number(args.slotText), created: true } } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' });
  const run = async (target: typeof event, input: unknown) => {
    const result = await app.invoke(target, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'save_battle_template', input), 'ai-plugin');
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.actions, []);
  };
  await run(event, { slot: 2, name: '配装' });
  await run(event, { name: '配装', slot: 2 });
  await run(event, { slot: 3, name: '配装' });
  await run({ ...event, MessageId: 'different-message' }, { slot: 2, name: '配装' });
  await run({ ...event, UserId: 'other-player' }, { slot: 2, name: '配装' });
  assert.ok(keys.every(key => /^[0-9a-f]{64}$/.test(key)));
  assert.equal(keys[0], keys[1]);
  assert.equal(new Set([keys[0], ...keys.slice(2)]).size, 4);
});

for (const [action, input] of [
  ['cultivate_cave_plot', { plotIndex: 0 }],
  ['plant_cave_seed', { plotIndex: 1, seedName: '' }],
  ['water_cave_plots', { plotIndex: -1 }],
  ['mine_guild', { guildId: 999 }],
  ['challenge_storyline', { chapterNumber: 1, stageNumber: 5 }],
  ['choose_storyline_skill', { sessionId: 'manual-1', choice: 'normal' }],
  ['choose_storyline_skill', { sessionId: 'manual-1', expectedRevision: 0, choice: 'normal' }],
  ['choose_storyline_skill', { sessionId: 'manual-1', expectedRevision: 1, choice: '任意技能' }],
  ['sweep_dungeon', { dungeonName: '秘境', times: 2 }],
  ['sweep_dungeon', { dungeonName: '秘境', times: 9 }],
  ['sweep_storyline', { chapterNumber: 1, stageNumber: 5, times: 1 }],
  ['sweep_storyline', { chapterNumber: 1, stageNumber: 1, times: 10000 }],
  ['claim_storyline_chest', { chapterNumber: 1, chestIndex: 0 }],
  ['challenge_dungeon', { dungeonName: '' }],
  ['challenge_demon_tower', { stars: 0 }],
  ['challenge_demon_tower', { stars: 4 }],
  ['select_demon_tower_buff', { buffKey: 'hp', count: 0 }],
  ['select_demon_tower_buff', { buffKey: 'speed', count: 1 }],
  ['challenge_world_boss', { mode: 'all' }],
  ['open_lootbox', { lootboxName: '礼盒', openCount: 0 }],
  ['open_lootbox', { lootboxName: '礼盒', openCount: 11 }],
  ['open_lootbox', { lootboxName: '礼盒', openCount: 1.5 }],
  ['open_lootbox', { lootboxName: '', openCount: 1 }],
  ['equip_equipment', { identifier: '' }],
  ['unequip_equipment', { equipmentTypeName: '' }],
  ['unequip_skill_book', { skillType: '任意功法' }],
  ['hide_skill_book', { bookId: Number.MAX_SAFE_INTEGER + 1 }],
  ['show_skill_book', { bookId: -1 }],
  ['apply_battle_template', { slot: 6 }],
  ['save_battle_template', { slot: 1.5 }],
  ['delete_battle_template', { slot: 0 }]
] as const) test(`${action}: 拒绝非法参数 ${JSON.stringify(input)}`, async t => {
  const app = createTestApp({ config: { 'xiuxian-game': {} } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => { throw new Error('invalid input must not reach HTTP'); });
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  assert.equal(result.value.ok, false);
  if (!result.value.ok) {
    assert.equal(result.value.error.code, 'INVALID_INPUT');
    assert.equal(result.value.error.outcome, 'not_started');
  }
  assert.deepEqual(result.messages, []);
  assert.deepEqual(result.actions, []);
});
