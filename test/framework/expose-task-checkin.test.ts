import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotTask(LearnedBooksCombinedAndReplay|UnexpectedBusinessErrorHTTPReplay|ShopCombinedAndReplay|GuildCheckinCombinedAndReplay|CheckinCombinedAndReplay|CheckinUnavailableReplay|DungeonSweepCombinedAndReplay|HomeCombinedAndReplay|HomeFailurePreservesContinuationAndReplay|CaveViewCombinedAndReplay|RealmViewCombinedAndReplay|ActivityViewCombinedAndReplay|PanelCombinedAndReplay|DungeonCatalogCombinedAndReplay|StorylineCatalogCombinedAndReplay|InventoryCombinedAndReplay|EquipmentInventoryCombinedAndReplay|OtherInventoryCombinedAndReplay|InventoryMenuCombinedAndReplay|CheckinHomeFullChainAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const guildCheckinMatch = output.match(/EXPOSE_TASK_GUILD_CHECKIN=(.+)/);
assert.ok(guildCheckinMatch);
const guildCheckinFixture = JSON.parse(guildCheckinMatch[1]);
const shopMatch = output.match(/EXPOSE_TASK_SHOP=(.+)/);
assert.ok(shopMatch);
const shopFixture = JSON.parse(shopMatch[1]);
const unexpectedMatch = output.match(/EXPOSE_TASK_UNEXPECTED=(.+)/);
assert.ok(unexpectedMatch);
const unexpectedFixture = JSON.parse(unexpectedMatch[1]);
const learnedTaskMatch = output.match(/EXPOSE_TASK_LEARNED=(.+)/);
assert.ok(learnedTaskMatch);
const learnedTaskFixture = JSON.parse(learnedTaskMatch[1]);
const learnedPageMatch = output.match(/EXPOSE_TASK_LEARNED_PAGE_TWO=(.+)/);
assert.ok(learnedPageMatch);
const learnedPageFixture = JSON.parse(learnedPageMatch[1]);
const fixtureMatch = output.match(/EXPOSE_TASK_CHECKIN=(.+)/);
assert.ok(fixtureMatch);
const fixture = JSON.parse(fixtureMatch[1]);
const failureMatch = output.match(/EXPOSE_TASK_CHECKIN_FAILURE=(.+)/);
assert.ok(failureMatch);
const failureFixture = JSON.parse(failureMatch[1]);
const sweepMatch = output.match(/EXPOSE_TASK_SWEEP=(.+)/);
assert.ok(sweepMatch);
const sweepFixture = JSON.parse(sweepMatch[1]);
const homeMatch = output.match(/EXPOSE_TASK_HOME=(.+)/);
assert.ok(homeMatch);
const homeFixture = JSON.parse(homeMatch[1]);
const fullChainCheckinMatch = output.match(/EXPOSE_FULL_CHAIN_CHECKIN=(.+)/);
const fullChainHomeMatch = output.match(/EXPOSE_FULL_CHAIN_HOME=(.+)/);
assert.ok(fullChainCheckinMatch && fullChainHomeMatch);
const fullChainCheckinFixture = JSON.parse(fullChainCheckinMatch[1]);
const fullChainHomeFixture = JSON.parse(fullChainHomeMatch[1]);
const homeFailureMatch = output.match(/EXPOSE_TASK_HOME_FAILURE=(.+)/);
assert.ok(homeFailureMatch);
const homeFailureFixture = JSON.parse(homeFailureMatch[1]);
const caveMatch = output.match(/EXPOSE_TASK_CAVE_VIEW=(.+)/);
assert.ok(caveMatch);
const caveFixture = JSON.parse(caveMatch[1]);
const realmMatch = output.match(/EXPOSE_TASK_REALM_VIEW=(.+)/);
assert.ok(realmMatch);
const realmFixture = JSON.parse(realmMatch[1]);
const panelMatch = output.match(/EXPOSE_TASK_PANEL=(.+)/);
assert.ok(panelMatch);
const panelFixture = JSON.parse(panelMatch[1]);
const dungeonCatalogMatch = output.match(/EXPOSE_TASK_DUNGEON_CATALOG=(.+)/);
const storylineCatalogMatch = output.match(/EXPOSE_TASK_STORYLINE_CATALOG=(.+)/);
assert.ok(dungeonCatalogMatch && storylineCatalogMatch);
const dungeonCatalogFixture = JSON.parse(dungeonCatalogMatch[1]);
const storylineCatalogFixture = JSON.parse(storylineCatalogMatch[1]);
const dungeonAliasMatch = output.match(/EXPOSE_TASK_DUNGEON_ALIAS=(.+)/);
const storylineAliasMatch = output.match(/EXPOSE_TASK_STORYLINE_ALIAS=(.+)/);
assert.ok(dungeonAliasMatch && storylineAliasMatch);
const dungeonAliasFixture = JSON.parse(dungeonAliasMatch[1]);
const dungeonDetailMatch = output.match(/EXPOSE_TASK_DUNGEON_DETAIL=(.+)/);
assert.ok(dungeonDetailMatch);
const dungeonDetailFixture = JSON.parse(dungeonDetailMatch[1]);
const storylineAliasFixture = JSON.parse(storylineAliasMatch[1]);
const storylineChapterMatch = output.match(/EXPOSE_TASK_STORYLINE_CHAPTER=(.+)/);
assert.ok(storylineChapterMatch);
const storylineChapterFixture = JSON.parse(storylineChapterMatch[1]);
const otherInventoryFixtures = Object.fromEntries([...output.matchAll(/EXPOSE_TASK_OTHER_INVENTORY=(tool|soul|lootbox)\|(.+)/g)].map(row => [row[1], JSON.parse(row[2])]));
assert.ok(otherInventoryFixtures.tool && otherInventoryFixtures.soul && otherInventoryFixtures.lootbox);
const equipmentInventoryFixtures = Object.fromEntries([...output.matchAll(/EXPOSE_TASK_EQUIPMENT_INVENTORY=(equipment|skill)\|(.+)/g)].map(row => [row[1], JSON.parse(row[2])]));
assert.ok(equipmentInventoryFixtures.equipment && equipmentInventoryFixtures.skill);
const inventoryMenuMatch = output.match(/EXPOSE_TASK_INVENTORY_MENU=(.+)/);
assert.ok(inventoryMenuMatch);
const inventoryMenuFixture = JSON.parse(inventoryMenuMatch[1]);
const inventoryFixtures = Object.fromEntries([...output.matchAll(/EXPOSE_TASK_INVENTORY=(prop|material)\|(.+)/g)].map(row => [row[1], JSON.parse(row[2])]));
assert.ok(inventoryFixtures.prop && inventoryFixtures.material);
const activityFixtures = Object.fromEntries([...output.matchAll(/EXPOSE_TASK_ACTIVITY=(daily|weekly)\|(.+)/g)].map(row => [row[1], JSON.parse(row[2])]));
assert.ok(activityFixtures.daily && activityFixtures.weekly);
test('签到在一次请求中传递当前任务步骤并返回推进结果', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const requests: any[] = [];
  let stopped = false;
  let failed = false;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests.push(request);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/checkin.hub');
    assert.equal(body.taskInput, '签到');
    assert.equal(body.messageText, '/签到');
    assert.deepEqual(body.arguments, {});
    const middleware = { outcome: stopped ? 'handled' : 'allow', reason: stopped ? 'TASK' : 'ALLOWED', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], taskContinuation: stopped ? { outcome: 'expected', command: '签到' } : { outcome: 'next', command: '我的资料' }, ...(!stopped ? { entry: { maintenance: { disabled: false }, routeAllowed: true, resourcesSettled: false, nativeComebackProcessed: false } } : {}) };
    return { status: 200, headers: {}, data: JSON.stringify(failed ? failureFixture : stopped ? { data: { success: true, branch: 'middleware', middleware } } : fixture) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (input: object) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'checkin_all', input), 'ai-plugin');
  const first = await call({ taskInput: '签到', intentId: 'first' });
  assert.equal(first.value.ok, true, JSON.stringify(first.value));
  if (first.value.ok) {
    assert.deepEqual((first.value.data as any).taskContinuation, { outcome: 'next', command: '我的资料' });
    assert.equal((first.value.data as any).result[0].status, 'done');
  }
  const firstKey = requests.at(-1).headers['idempotency-key'];
  await call({ taskInput: '签到', intentId: 'first' });
  assert.equal(requests.at(-1).headers['idempotency-key'], firstKey);
  stopped = true;
  const second = await call({ taskInput: '签到', intentId: 'second' });
  assert.notEqual(requests.at(-1).headers['idempotency-key'], firstKey);
  assert.equal(second.value.ok, true, JSON.stringify(second.value));
  if (second.value.ok) {
    assert.equal((second.value.data as any).branch, 'middleware');
    assert.deepEqual((second.value.data as any).taskContinuation, { outcome: 'expected', command: '签到' });
    assert.equal((second.value.data as any).result, undefined);
  }
  failed = true;
  const failure = await call({ taskInput: '签到', intentId: 'third' });
  assert.equal(failure.value.ok, true, JSON.stringify(failure.value));
  if (failure.value.ok) {
    assert.equal((failure.value.data as any).success, false);
    assert.equal((failure.value.data as any).taskContinuation.outcome, 'next');
    assert.equal((failure.value.data as any).result, undefined);
  }
  const before = requests.length;
  assert.equal((await call({ taskInput: '突破' })).value.ok, false);
  assert.equal(requests.length, before);
});

test('秘境任务步骤保留真实扫荡结算和任务推进回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/dungeon.sweep');
    assert.equal(body.taskInput, '扫荡秘境 试炼 1');
    assert.deepEqual(body.arguments, { mode: 'sweep', dungeonName: '试炼', times: 1 });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(sweepFixture) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'sweep_dungeon', { dungeonName: '试炼', times: 1, taskInput: '扫荡秘境 试炼 1', intentId: 'first' }), 'ai-plugin');
  const result = await call();
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) {
    assert.equal((result.value.data as any).taskContinuation.outcome, 'next');
    assert.equal((result.value.data as any).result.totalSpiritCost, 5);
    assert.equal((result.value.data as any).result.totalExp, 3);
  }
  await call();
  assert.equal(keys.at(-1), keys.at(-2));
});

test('修炼和灵田步骤只接受与所选操作一致的任务指令', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current: { action: string; op: string; command: string; args: object; input: object };
  const requests: any[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests.push(request);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    assert.equal(body.messageText, current.action === 'execute_task_alchemy_recipes' ? '/炼丹 丹方' : `/${current.command}`);
    assert.equal(body.taskInput, current.command);
    assert.deepEqual(body.arguments, current.args);
    const middleware = { outcome: 'handled', reason: 'TASK', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], taskContinuation: { outcome: 'expected', command: current.command } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'middleware', middleware } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of [
    { action: 'checkin_guild', op: 'guild.checkin', command: '宗门签到', args: {}, input: {} },
    { action: 'checkin_guild', op: 'guild.checkin', command: '联盟签到', args: {}, input: {} },
    { action: 'mine_guild', op: 'guild.mining', command: '宗门采矿', args: {}, input: {} },
    { action: 'mine_guild', op: 'guild.mining', command: '宗门挖矿', args: {}, input: {} },
    { action: 'claim_guild_stipend', op: 'guild.stipend-claim', command: '领取宗门俸禄', args: {}, input: {} },
    { action: 'claim_companion_daily', op: 'companion.claim-daily', command: '道侣签到', args: {}, input: {} },
    { action: 'claim_companion_month_card', op: 'companion.claim-month-card', command: '道侣月卡', args: {}, input: {} },
    { action: 'cultivate_all_cave_plots', op: 'cave.cultivate', command: '开垦所有', args: { plotIndex: null, all: true }, input: {} },
    { action: 'cultivate_all_cave_plots', op: 'cave.cultivate', command: '一键开垦', args: { plotIndex: null, all: true }, input: {} },
    { action: 'cultivate_cave_plot', op: 'cave.cultivate', command: '开垦 1', args: { plotIndex: '1' }, input: { plotIndex: 1 } },
    { action: 'upgrade_cave_plot', op: 'cave.upgrade', command: '升级灵田 1', args: { plotIndex: '1' }, input: { plotIndex: 1 } },
    { action: 'claim_newcomer_login', op: 'checkin.newcomer-login', command: '初入仙途签到', args: {}, input: {} },
    { action: 'claim_newcomer_task', op: 'newcomer-activity.claim-task', command: '新人任务领取 1', args: { taskConfigId: 1 }, input: { taskConfigId: 1 } },
    { action: 'claim_guild_milestone', op: 'guild.milestone-claim', command: '领取宗门日活奖励 1', args: { milestoneArg: '1', expectedType: 'daily_activity' }, input: { type: 'daily_activity', milestoneId: 1 } },
    { action: 'claim_all_guild_milestones', op: 'guild.milestone-claim-all', command: '一键领取宗门周活奖励', args: { type: 'weekly_activity' }, input: { type: 'weekly_activity' } },
    { action: 'claim_all_guild_milestones', op: 'guild.milestone-claim-all', command: '领取全部宗门日活奖励', args: { type: 'daily_activity' }, input: { type: 'daily_activity' } },
    { action: 'claim_all_guild_milestones', op: 'guild.milestone-claim-all', command: '领取全部宗门周活奖励', args: { type: 'weekly_activity' }, input: { type: 'weekly_activity' } },
    { action: 'worship_guild', op: 'guild.worship', command: '祭祀祖师 灵石', args: { offer: '灵石' }, input: { offer: '灵石' } },
    { action: 'dual_cultivate', op: 'companion.dual-cultivation', command: '双修', args: {}, input: {} },
    { action: 'challenge_guild_storyline', op: 'guild.storyline-challenge', command: '宗门主线挑战', args: {}, input: {} },
    { action: 'claim_guild_storyline_rewards', op: 'guild.storyline-claim', command: '领取宗门主线奖励 2', args: { stageIndex: 2 }, input: { stageIndex: 2 } },
    { action: 'claim_month_card_rewards', op: 'membership.claim-month-card', command: '一键领取月卡', args: {}, input: {} },
    { action: 'claim_combat_power_achievements', op: 'achievements.claim-combat-power', command: '成就 战力 领取', args: {}, input: {} },
    { action: 'claim_world_milestones', op: 'world-milestones.claim-all', command: '里程碑奖励 领取', args: {}, input: {} },
    { action: 'claim_native_comeback', op: 'native-comeback.claim', command: '回归签到', args: {}, input: {} },
    { action: 'claim_guild_competition_rewards', op: 'competition.reward-claim', command: '领取宗门大比奖励', args: {}, input: {} },
    { action: 'claim_limited_event_task', op: 'limited-event.task-claim', command: '活动任务领取 1', args: { input: '/活动任务领取 1' }, input: { taskId: 1 } },
    { action: 'claim_email', op: 'emails.claim', command: '领取邮件 1', args: { emailId: 1 }, input: { emailId: 1 } },
    { action: 'challenge_tongtian_rank', op: 'ranking.challenge', command: '挑战排名 9', args: { rankArg: '9' }, input: { targetRank: 9 } },
    { action: 'batch_challenge_tongtian', op: 'ranking.batch-challenge', command: '连续爬塔', args: {}, input: {} },
    { action: 'sweep_tongtian_rank', op: 'ranking.sweep', command: '扫荡排名 9 2', args: { rankArg: '9', countArg: '2' }, input: { targetRank: 9, count: 2 } },
    { action: 'claim_tongtian_first_reward', op: 'ranking.claim-first', command: '领取首通奖励 9', args: { claimArg: '9' }, input: { ranking: 9 } },
    { action: 'claim_all_tongtian_first_rewards', op: 'ranking.claim-first', command: '领取首通奖励 全部', args: { claimArg: '全部' }, input: {} },
    { action: 'claim_tongtian_monthly_reward', op: 'ranking.claim-monthly', command: '领取月度奖励 9', args: { claimArg: '9' }, input: { rewardId: 9 } },
    { action: 'claim_all_tongtian_monthly_rewards', op: 'ranking.claim-monthly', command: '领取月度奖励 全部', args: { claimArg: '全部' }, input: {} },
    { action: 'challenge_tianjiao', op: 'tianjiao.challenge', command: '登天挑战 9', args: { rankArg: '9' }, input: { rank: 9 } },
    { action: 'challenge_spirit_vein_position', op: 'secret-realm.challenge', command: '灵脉攻防战挑战 1 2', args: { realmNo: '1', positionNo: '2' }, input: { realmNo: 1, positionNo: 2 } },
    { action: 'claim_spirit_vein_war_rewards', op: 'secret-realm.claim', command: '灵脉攻防战领取奖励', args: {}, input: {} },
    { action: 'challenge_guild_competition', op: 'competition.challenge', command: '挑战宗门 1', args: { target: { defenderGuildId: 1 } }, input: { guildId: 1 } },
    { action: 'comprehend_skill_book', op: 'skill-books.proficiency', command: '参悟 1 2', args: { tokens: ['1', '2'] }, input: { bookId: 1, points: 2 } },
    { action: 'upgrade_skill_book', op: 'skill-books.batch-upgrade', command: '升级功法 1 2', args: { bookId: '1', count: '2' }, input: { bookId: 1, count: 2 } },
    { action: 'switch_skill_book', op: 'skill-books.switch', command: '切换战技 1', args: { skillType: '战技', bookId: '1', confirm: null }, input: { skillType: '战技', bookId: 1 } },
    { action: 'store_green_bottles', op: 'green-bottle.store', command: '小绿瓶存储 2', args: { count: 2 }, input: { count: 2 } },
    { action: 'execute_task_guild_daily', op: 'guild.daily', command: '宗门日常', args: {}, input: {} },
    { action: 'execute_task_guild_weekly', op: 'guild.weekly', command: '宗门周常', args: {}, input: {} },
    { action: 'claim_daily_activity', op: 'activity-points.claim-daily', command: '领取日常活跃奖励 20', args: { mode: 'claim', requiredPoints: 20 }, input: { requiredPoints: 20 } },
    { action: 'claim_weekly_activity', op: 'activity-points.claim-weekly', command: '领取周常活跃奖励 20', args: { mode: 'claim', requiredPoints: 20 }, input: { requiredPoints: 20 } },
    { action: 'execute_task_newcomer_activity', op: 'newcomer-activity.overview', command: '初入仙途', args: {}, input: {} },
    { action: 'execute_task_companion', op: 'companion.info', command: '我的道侣', args: {}, input: {} },
    { action: 'execute_task_companion_tasks', op: 'companion.tasks', command: '道侣任务', args: { args: '' }, input: {} },
    { action: 'execute_task_limited_event_tasks', op: 'limited-event.tasks', command: '活动任务', args: {}, input: {} },
    { action: 'teach_all_disciples', op: 'master.teach-all', command: '一键传功', args: {}, input: {} },
    { action: 'teach_disciple', op: 'master.teach', command: '传功 1', args: { targetArg: '1' }, input: { targetUid: 1 } },
    { action: 'bless_disciple', op: 'master.bless', command: '赐福 1', args: { targetArg: '1' }, input: { targetUid: 1 } },
    { action: 'gift_disciple_pill', op: 'master.gift', command: '赐丹 1 培元丹', args: { targetArg: '1', itemKey: 'peiyuan' }, input: { targetUid: 1, itemKey: 'peiyuan' } },
    { action: 'claim_master_title', op: 'master.title-claim', command: '领取师门称号', args: {}, input: {} },
    { action: 'execute_task_tianjiao_leaderboard', op: 'tianjiao.leaderboard', command: '登天梯', args: {}, input: {} },
    { action: 'execute_task_tongtian_tower', op: 'ranking.overview', command: '通天塔', args: {}, input: {} },
    { action: 'execute_task_guild_storyline', op: 'guild.storyline-home', command: '宗门主线', args: {}, input: {} },
    { action: 'execute_task_limited_events', op: 'limited-event.overview', command: '限时活动', args: {}, input: {} },
    { action: 'execute_task_meridians', op: 'meridians.view', command: '经络', args: {}, input: {} },
    { action: 'execute_task_world_boss', op: 'world-boss.info', command: '凶兽', args: {}, input: {} },
    { action: 'execute_task_demon_tower', op: 'demon-tower.info', command: '妖塔', args: {}, input: {} },
    { action: 'execute_task_exploration', op: 'seclusion.command', command: '探索秘境', args: { action: 'view' }, input: {} },
    { action: 'execute_task_my_team', op: 'teams.overview', command: '我的队伍', args: {}, input: {} },
    { action: 'execute_task_guild_shop', op: 'guild.shop', command: '宗门商店', args: {}, input: {} },
    { action: 'execute_task_shop', op: 'shops.list', command: '商店', args: { page: 1 }, input: {} },
    { action: 'execute_task_emails', op: 'emails.list', command: '我的邮件', args: { pageText: '1' }, input: {} },
    { action: 'execute_task_learned_books', op: 'skill-books.learned', command: '我的功法', args: { page: null }, input: {} },
    { action: 'execute_task_alchemy_recipes', op: 'alchemy.v2', command: '丹方', args: {}, input: {} },
    { action: 'execute_task_master_info', op: 'master.info', command: '我的师门', args: {}, input: {} },
    { action: 'execute_task_membership_rights', op: 'membership.rights', command: '我的权益', args: {}, input: {} },
    { action: 'execute_task_friends', op: 'friends.overview', command: '我的好友', args: { page: 1, pageSize: 5 }, input: {} },
    { action: 'execute_task_guild_competition', op: 'competition.home', command: '宗门大比', args: {}, input: {} },
    { action: 'execute_task_spirit_vein_war', op: 'secret-realm.home', command: '灵脉攻防战', args: {}, input: {} },
    { action: 'execute_task_spirit_vein_list', op: 'secret-realm.list', command: '灵脉攻防战列表', args: { page: '1' }, input: {} },
    { action: 'execute_task_spirit_vein_view_help', op: 'secret-realm.view', command: '灵脉攻防战查看', args: { realmNo: null, page: '1' }, input: {} },
    { action: 'execute_task_gift_options', op: 'companion.gift', command: '赠送 2', args: { firstParam: '2' }, input: { targetUid: 2 } },
    { action: 'send_gift', op: 'companion.gift', command: '赠送 2 灵花', args: { firstParam: '2', secondParam: '灵花' }, input: { targetUid: 2, giftName: '灵花' } },
    { action: 'execute_task_visit_cave', op: 'cave.visit', command: '查看灵田 2', args: { target: { uid: 2 } }, input: { ownerUid: 2 } },
    { action: 'start_exploration', op: 'seclusion.command', command: '探索秘境 桃花镇 4', args: { action: 'start', dungeonName: '桃花镇', duration: 4 }, input: { dungeonName: '桃花镇', duration: 4 } },
    { action: 'end_exploration', op: 'seclusion.end', command: '返程', args: {}, input: {} },
    { action: 'end_exploration', op: 'seclusion.end', command: '结束探索', args: {}, input: {} },
    { action: 'select_demon_tower_buff', op: 'demon-tower.buff', command: '妖塔选buff 生命', args: { selection: { buffKey: 'hp', count: 1 } }, input: { buffKey: 'hp', count: 1 } },
    { action: 'select_demon_tower_buff', op: 'demon-tower.buff', command: '妖塔选buff 暴伤 2', args: { selection: { buffKey: 'critDmg', count: 2 } }, input: { buffKey: 'critDmg', count: 2 } },
    { action: 'reset_demon_tower', op: 'demon-tower.reset', command: '妖塔重置', args: {}, input: {} },
    { action: 'equip_equipment', op: 'equipment.equip', command: '装备 灵剑', args: { identifier: '灵剑' }, input: { identifier: '灵剑' } },
    { action: 'equip_equipment_by_id', op: 'equipment.equip', command: '装备 2', args: { identifier: '2' }, input: { instanceId: 2 } },
    { action: 'auto_equip_equipment', op: 'equipment.auto-equip', command: '一键装备', args: {}, input: {} },
    { action: 'unequip_equipment', op: 'equipment.unequip-one', command: '卸下 武器', args: { equipmentTypeName: '武器' }, input: { equipmentTypeName: '武器' } },
    { action: 'unequip_skill_book', op: 'skill-books.unequip', command: '换下战技', args: { skillType: '战技' }, input: { skillType: '战技' } },
    { action: 'execute_task_learned_books', op: 'skill-books.learned', command: '我的功法 0002', args: { page: '0002' }, input: { page: 2 } },
    { action: 'execute_task_emails', op: 'emails.list', command: '我的邮件 0002', args: { pageText: '2' }, input: { page: 2 } },
    { action: 'execute_task_guild_worship_options', op: 'guild.worship', command: '祭祀祖师', args: { offer: '' }, input: {} },
    { action: 'execute_task_preview_alchemy', op: 'alchemy.v2', command: '炼丹 预览 1 2', args: {}, input: { recipeId: 1, count: 2 } },
    { action: 'prepare_skill_learn', op: 'skill-books.learn', command: '学习功法 2', args: { bookId: '2', confirm: null, exposePreview: true }, input: { bookId: 2 } },
    { action: 'learn_skill_book', op: 'skill-books.learn', command: '学习功法 2', args: { bookId: '2', confirm: null }, input: { bookId: 2 } },
    { action: 'learn_current_skill_batch', op: 'skill-books.batch-learn', command: '一键学习功法 确认', args: { mode: 'execute' }, input: {} },
    { action: 'start_meditation', op: 'meditation.start', command: '闭关', args: {}, input: {} },
    { action: 'end_meditation', op: 'meditation.end', command: '出关', args: {}, input: {} },
    { action: 'end_meditation', op: 'meditation.end', command: '打坐结束', args: {}, input: {} },
    { action: 'end_meditation', op: 'meditation.end', command: '结束打坐', args: {}, input: {} },
    { action: 'pulse_meridian', op: 'meridians.pulse', command: '冲脉', args: {}, input: {} },
    { action: 'breakthrough_realm', op: 'realm.breakthrough', command: '突破', args: {}, input: {} },
    { action: 'water_cave_plots', op: 'cave.water', command: '浇灌 1', args: { plotIndex: '1' }, input: { plotIndex: 1 } },
    { action: 'water_cave_plots', op: 'cave.water', command: '一键浇灌 1', args: { plotIndex: '1' }, input: { plotIndex: 1 } },
    { action: 'water_cave_plots', op: 'cave.water', command: '一键浇灌', args: { plotIndex: null }, input: {} },
    { action: 'remove_cave_worms', op: 'cave.worm', command: '除虫', args: { plotIndex: null }, input: {} },
    { action: 'remove_cave_worms', op: 'cave.worm', command: '一键除虫', args: { plotIndex: null }, input: {} },
    { action: 'remove_cave_weeds', op: 'cave.weed', command: '除草', args: { plotIndex: null }, input: {} },
    { action: 'remove_cave_weeds', op: 'cave.weed', command: '一键除草', args: { plotIndex: null }, input: {} },
    { action: 'harvest_cave_plots', op: 'cave.harvest', command: '收割', args: { plotIndex: null }, input: {} },
    { action: 'harvest_cave_plots', op: 'cave.harvest', command: '一键收割', args: { plotIndex: null }, input: {} },
    { action: 'challenge_dungeon', op: 'dungeon.challenge', command: '秘境挑战 青云', args: { mode: 'challenge', dungeonName: '青云' }, input: { dungeonName: '青云' } },
    { action: 'sweep_dungeon', op: 'dungeon.sweep', command: '扫荡秘境 青云 5', args: { mode: 'sweep', dungeonName: '青云', times: 5 }, input: { dungeonName: '青云', times: 5 } },
    { action: 'challenge_storyline', op: 'storyline.challenge', command: '主线挑战 1-2', args: { input: '/主线挑战 1-2' }, input: { chapterNumber: 1, stageNumber: 2 } },
    { action: 'sweep_storyline', op: 'storyline.sweep', command: '主线扫荡 1-2 5', args: { input: '/主线扫荡 1-2 5' }, input: { chapterNumber: 1, stageNumber: 2, times: 5 } },
    { action: 'challenge_world_boss', op: 'world-boss.challenge', command: '挑战凶兽', args: { mode: 'single' }, input: {} },
    { action: 'spar_with_player', op: 'pvp.spar', command: '比试 2', args: { targetUid: '2' }, input: { targetUid: 2 } },
    { action: 'spar_with_player', op: 'pvp.spar', command: '十连比试 2', args: { targetUid: '2', batch: true }, input: { targetUid: 2, batch: true } },
    { action: 'challenge_world_boss_all', op: 'world-boss.challenge', command: '挑战凶兽 全部', args: { mode: 'all' }, input: {} },
    { action: 'claim_world_boss_rewards', op: 'world-boss.reward-claim', command: '领取凶兽奖励', args: {}, input: {} },
    { action: 'sweep_free_dungeons_with_ids', op: 'dungeon.sweep-free-detailed', command: '扫荡免费秘境', args: {}, input: {} },
    { action: 'claim_storyline_chest', op: 'storyline.chests-claim', command: '领取宝箱 1 2', args: { input: '/领取宝箱 1 2' }, input: { chapterNumber: 1, chestIndex: 2 } },
    { action: 'claim_storyline_chapter_chests', op: 'storyline.chests-claim', command: '领取宝箱 1', args: { input: '/领取宝箱 1' }, input: { chapterNumber: 1 } },
    { action: 'claim_all_storyline_chests', op: 'storyline.chests-claim-all', command: '一键领取宝箱', args: {}, input: {} },
    { action: 'challenge_demon_tower', op: 'demon-tower.challenge', command: '妖塔挑战 2', args: { stars: 2 }, input: { stars: 2 } },
    { action: 'sweep_demon_tower', op: 'demon-tower.sweep', command: '妖塔扫荡', args: {}, input: {} },
    { action: 'checkin_daily', op: 'checkin.daily', command: '日常签到', args: {}, input: {} },
    { action: 'checkin_all', op: 'checkin.hub', command: '一键签到', args: {}, input: {} },
    { action: 'checkin_newcomer', op: 'checkin.newcomer', command: '新人签到', args: {}, input: {} },
    { action: 'checkin_celestial', op: 'checkin.celestial', command: '登仙台签到', args: {}, input: {} },
    { action: 'checkin_limited_event', op: 'checkin.limited-event', command: '活动签到', args: {}, input: {} },
    { action: 'claim_all_daily_activity', op: 'activity-points.claim-all-daily', command: '一键领取日常活跃奖励', args: {}, input: {} },
    { action: 'claim_all_weekly_activity', op: 'activity-points.claim-all-weekly', command: '一键领取周常活跃奖励', args: {}, input: {} },
    { action: 'claim_all_daily_activity', op: 'activity-points.claim-all-daily', command: '领取全部日常活跃奖励', args: {}, input: {} },
    { action: 'claim_all_weekly_activity', op: 'activity-points.claim-all-weekly', command: '领取全部周常活跃奖励', args: {}, input: {} },
    { action: 'claim_all_achievements', op: 'achievements.claim-all', command: '一键领取成就', args: {}, input: {} },
    { action: 'claim_all_achievements', op: 'achievements.claim-all', command: '成就 一键领取', args: {}, input: {} },
    { action: 'claim_all_emails', op: 'emails.claim-all', command: '一键领取邮件', args: {}, input: {} },
    { action: 'plant_for_alchemy_recipe', op: 'cave.plant', command: '一键播种 聚气丹 2', args: { recipeName: '聚气丹', count: '2' }, input: { recipeName: '聚气丹', count: 2 } },
    { action: 'plant_all_cave_plots', op: 'cave.plant', command: '播种 灵种', args: { plotIndex: null, seedName: '灵种' }, input: { seedName: '灵种' } },
    { action: 'plant_cave_seed', op: 'cave.plant', command: '播种 1 灵种', args: { plotIndex: '1', seedName: '灵种' }, input: { plotIndex: 1, seedName: '灵种' } },
    { action: 'tend_cave_plots', op: 'cave.tend-all', command: '一键打理灵田', args: { harvest: false }, input: {} },
    { action: 'tend_companion_cave_plots', op: 'cave.companion-tend-all', command: '一键照料道侣灵田 代收割', args: { harvest: true }, input: { harvest: true } },
    { action: 'consume_item', op: 'items.consume', command: '消耗 培元丹 2', args: { itemName: '培元丹', quantity: 2, mode: 'expose' }, input: { itemName: '培元丹', quantity: 2 } },
    { action: 'consume_item', op: 'items.consume', command: '服用 培元丹', args: { itemName: '培元丹', quantity: 1, mode: 'expose' }, input: { itemName: '培元丹', quantity: 1 } },
    { action: 'consume_item', op: 'items.consume', command: '炼化 培元丹 2', args: { itemName: '培元丹', quantity: 2, mode: 'expose' }, input: { itemName: '培元丹', quantity: 2 } },
    { action: 'open_lootbox', op: 'lootboxes.open', command: '开启礼盒 礼盒 1', args: { lootboxName: '礼盒', openCount: 1 }, input: { lootboxName: '礼盒', openCount: 1 } }
  ]) {
    const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', current.action, { ...current.input, taskInput, ...(!['checkin_daily', 'checkin_newcomer', 'checkin_celestial', 'checkin_limited_event'].includes(current.action) ? { intentId: 'first' } : {}) }), 'ai-plugin');
    const result = await call(current.command);
    assert.equal(result.value.ok, true, `${current.action}: ${JSON.stringify(result.value)}`);
    if (result.value.ok) assert.equal((result.value.data as any).taskContinuation.outcome, 'expected');
    const before = requests.length;
    if (current.action === 'select_demon_tower_buff' && current.command === '妖塔选buff 生命') {
      assert.equal((await call('妖塔选buff 攻击 1')).value.ok, false);
      assert.equal((await call('妖塔选buff 生命 2')).value.ok, false);
    }
    if (current.action === 'claim_all_daily_activity') assert.equal((await call('领取全部周常活跃奖励')).value.ok, false);
    if (current.action === 'water_cave_plots' && current.command === '一键浇灌 1') assert.equal((await call('一键浇灌 2')).value.ok, false);
    if (current.action === 'consume_item') assert.equal((await call('服用 培元丹 3')).value.ok, false);
    if (current.action === 'spar_with_player') assert.equal((await call('比试 3')).value.ok, false);
    if (current.action === 'claim_all_weekly_activity') assert.equal((await call('领取全部日常活跃奖励')).value.ok, false);
    if (current.action === 'claim_all_guild_milestones') assert.equal((await call(current.input && 'type' in current.input && current.input.type === 'daily_activity' ? '领取全部宗门周活奖励' : '领取全部宗门日活奖励')).value.ok, false);
    assert.equal((await call('其他指令')).value.ok, false);
    assert.equal(requests.length, before);
  }
});

test('主页任务使用真实服务端回执并拒绝其他指令', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  let failed = false;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/home-overview');
    assert.equal(body.messageText, '/我的资料');
    assert.equal(body.taskInput, '我的资料');
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(failed ? homeFailureFixture : homeFixture) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_home', { taskInput, intentId: 'home' }), 'ai-plugin');
  const result = await call('我的资料');
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) {
    assert.equal((result.value.data as any).taskContinuation.outcome, 'completed');
    assert.equal((result.value.data as any).profile.user.id, 1);
  }
  await call('我的资料');
  assert.equal(keys.at(-1), keys.at(-2));
  failed = true;
  const failure = await call('我的资料');
  assert.equal(failure.value.ok, true, JSON.stringify(failure.value));
  if (failure.value.ok) {
    assert.equal((failure.value.data as any).success, false);
    assert.equal((failure.value.data as any).taskContinuation.outcome, 'completed');
    assert.equal((failure.value.data as any).profile, undefined);
  }
  const before = keys.length;
  assert.equal((await call('我的资料 2')).value.ok, false);
  assert.equal(keys.length, before);
});

test('灵田任务查看返回真实地块和任务推进', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  let expected = '灵田';
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/cave.view');
    assert.equal(body.messageText, `/${expected}`);
    assert.equal(body.taskInput, expected);
    assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(caveFixture) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_cave_view', { taskInput, intentId: taskInput === '我的灵田' ? 'view2' : 'view' }), 'ai-plugin');
  const result = await call('灵田');
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) {
    assert.equal((result.value.data as any).taskContinuation.outcome, 'next');
    assert.equal((result.value.data as any).result.plots.length, caveFixture.data.data.overview.plots.length);
    assert.equal((result.value.data as any).result.plots[0].plotIndex, 1);
  }
  await call('灵田');
  assert.equal(keys.at(-1), keys.at(-2));
  expected = '我的灵田';
  assert.equal((await call('我的灵田')).value.ok, true);
  const before = keys.length;
  assert.equal((await call('灵田 地块 2')).value.ok, false);
  assert.equal(keys.length, before);
});

test('境界任务查看返回真实境界展示和任务推进', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/realm.overview');
    assert.equal(body.messageText, '/我的境界');
    assert.equal(body.taskInput, '我的境界');
    assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(realmFixture) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_realm_view', { taskInput, intentId: 'realm' }), 'ai-plugin');
  const result = await call('我的境界');
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) {
    assert.equal((result.value.data as any).taskContinuation.outcome, 'next');
    assert.deepEqual((result.value.data as any).result.sections, realmFixture.data.data.sections);
  }
  await call('我的境界');
  assert.equal(keys.at(-1), keys.at(-2));
  const before = keys.length;
  assert.equal((await call('突破')).value.ok, false);
  assert.equal(keys.length, before);
});

test('活跃面板任务保留服务端进度和推进回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let kind = 'daily'; let command = '日常活跃';
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/activity-points.${kind}`);
    assert.equal(body.messageText, `/${command}`);
    assert.equal(body.taskInput, command);
    assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(activityFixtures[kind]) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const row of [{ kind: 'daily', command: '日常活跃' }, { kind: 'weekly', command: '周常活跃' }]) {
    kind = row.kind; command = row.command;
    const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', `execute_task_${kind}_activity`, { taskInput, intentId: 'activity' }), 'ai-plugin');
    const result = await call(command);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) {
      assert.equal((result.value.data as any).taskContinuation.outcome, 'next');
      assert.equal((result.value.data as any).result.cyclePeriod, activityFixtures[kind].data.data.cyclePeriod);
      assert.deepEqual((result.value.data as any).result.tasks, activityFixtures[kind].data.data.tasks);
    }
    await call(command);
    assert.equal(keys.at(-1), keys.at(-2));
    const before = keys.length;
    assert.equal((await call('我的境界')).value.ok, false);
    assert.equal(keys.length, before);
  }
});

test('任务面板步骤保留真实面板和任务推进', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/task-panel.view');
    assert.equal(body.messageText, '/任务面板');
    assert.equal(body.taskInput, '任务面板');
    assert.deepEqual(body.arguments, { tab: '' });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(panelFixture) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_panel', { taskInput, intentId: 'panel' }), 'ai-plugin');
  const result = await call('任务面板');
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) {
    assert.equal((result.value.data as any).taskContinuation.outcome, 'next');
    assert.equal((result.value.data as any).result.defaultTabKey, panelFixture.data.data.view.defaultTabKey);
  }
  await call('任务面板');
  assert.equal(keys.at(-1), keys.at(-2));
  const before = keys.length;
  assert.equal((await call('任务面板 不存在')).value.ok, false);
  assert.equal(keys.length, before);
});

test('修仙面板任务从指令读取分类且拒绝不一致的 tab', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls++;
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, '/修仙面板 修炼');
    assert.equal(body.taskInput, '修仙面板 修炼');
    assert.deepEqual(body.arguments, { tab: '修炼' });
    const middleware = { outcome: 'handled', reason: 'TASK', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], taskContinuation: { outcome: 'expected', command: '修仙面板 修炼' } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'middleware', middleware } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (input: object) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_panel', input), 'ai-plugin');
  assert.equal((await call({ taskInput: '修仙面板 修炼' })).value.ok, true);
  assert.equal((await call({ taskInput: '修仙面板 修炼', tab: '签到' })).value.ok, false);
  assert.equal(calls, 1);
});

test('目录任务返回真实秘境和主线数据并保持任务回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = { action: 'execute_task_dungeon_catalog', op: 'dungeon.catalog', command: '查看秘境', args: { pageText: '1' }, fixture: dungeonCatalogFixture } as { action: string; op: string; command: string; args: object; fixture: any };
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    assert.equal(body.taskInput, current.command);
    assert.deepEqual(body.arguments, current.args);
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(current.fixture) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of [current, { action: 'execute_task_storyline_catalog', op: 'storyline.catalog', command: '查看主线', args: { input: '/查看主线' }, fixture: storylineCatalogFixture }]) {
    const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', current.action, { taskInput, intentId: 'catalog' }), 'ai-plugin');
    const result = await call(current.command);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) {
      const data = result.value.data as any;
      assert.equal(data.taskContinuation.outcome, 'next');
      if (current.op === 'dungeon.catalog') assert.equal(data.result.items[0].id, 1);
      else assert.equal(data.result.overview.chapters[0].chapterNumber, current.fixture.data.data.overview.chapters[0].chapterNumber);
    }
    await call(current.command);
    assert.equal(keys.at(-1), keys.at(-2));
    const before = keys.length;
    assert.equal((await call('其他指令')).value.ok, false);
    assert.equal(keys.length, before);
  }
});

test('目录任务支持现有别名，页码必须与步骤一致', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let expected: { op: string; message: string; args: object };
  const requests: any[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests.push(request);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${expected.op}`);
    assert.equal(body.messageText, expected.message);
    assert.deepEqual(body.arguments, expected.args);
    const middleware = { outcome: 'handled', reason: 'TASK', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], taskContinuation: { outcome: 'expected', command: body.taskInput } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'middleware', middleware } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const row of [
    { action: 'execute_task_dungeon_catalog', input: { taskInput: '秘境列表 2', page: 2 }, op: 'dungeon.catalog', message: '/秘境列表 2', args: { pageText: '2' } },
    { action: 'execute_task_storyline_catalog', input: { taskInput: '主线列表 p2' }, op: 'storyline.catalog', message: '/主线列表 p2', args: { input: '/主线列表 p2' } },
    { action: 'execute_task_storyline_catalog', input: { taskInput: '副本列表' }, op: 'storyline.catalog', message: '/副本列表', args: { input: '/副本列表' } }
  ]) {
    expected = row;
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', row.action, row.input), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
  }
  const count = requests.length;
  for (const [action, input] of [
    ['execute_task_dungeon_catalog', { taskInput: '秘境列表 2', page: 1 }],
    ['execute_task_storyline_catalog', { taskInput: '主线列表 2' }],
    ['execute_task_storyline_catalog', { taskInput: '主线列表 p2', page: 1 }]
  ] as const) {
    assert.equal((await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin')).value.ok, false);
  }
  assert.equal(requests.length, count);
});

test('目录别名使用真实服务端回执保留分页与任务推进', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current: { action: string; command: string; fixture: any };
  t.mock.method(axios, 'create', () => ({ request: async () => ({ status: 200, headers: {}, data: JSON.stringify(current.fixture) }) }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of [
    { action: 'execute_task_dungeon_catalog', command: '秘境列表 2', fixture: dungeonAliasFixture },
    { action: 'execute_task_storyline_catalog', command: '主线列表 p2', fixture: storylineAliasFixture }
  ]) {
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', current.action, { taskInput: current.command }), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (run.value.ok) {
      const data = run.value.data as any;
      assert.equal(data.taskContinuation.outcome, 'next');
      if (current.action === 'execute_task_storyline_catalog') assert.equal(data.result.overview.currentPage, 2);
      else assert.equal(data.result.pagination.currentPage, current.fixture.data.data.currentPage);
    }
  }
});

test('主线章节任务保留真实关卡和任务回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/storyline.catalog');
    assert.equal(body.taskInput, '查看主线 1');
    assert.deepEqual(body.arguments, { input: '/查看主线 1' });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(storylineChapterFixture) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (input: object) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_storyline_chapter', input), 'ai-plugin');
  const result = await call({ taskInput: '查看主线 1', intentId: 'chapter' });
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) {
    const data = result.value.data as any;
    assert.equal(data.taskContinuation.outcome, 'next');
    assert.equal(data.result.detail.chapterNumber, 1);
    assert.deepEqual(data.result.detail.stages.map((stage: any) => stage.stageNumber), [1, 2, 3, 4]);
  }
  await call({ taskInput: '查看主线 1', intentId: 'chapter' });
  assert.equal(keys.at(-1), keys.at(-2));
  const before = keys.length;
  assert.equal((await call({ taskInput: '查看主线 1', chapterNumber: 2 })).value.ok, false);
  assert.equal((await call({ taskInput: '查看主线 p1' })).value.ok, false);
  assert.equal(keys.length, before);
});

test('秘境详情任务保留真实目标和推进回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/dungeon.detail');
    assert.equal(body.taskInput, '秘境详情 试炼');
    assert.deepEqual(body.arguments, { name: '试炼' });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(dungeonDetailFixture) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (input: object) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_dungeon_detail', input), 'ai-plugin');
  const result = await call({ dungeonName: '试炼', taskInput: '秘境详情 试炼', intentId: 'detail' });
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) {
    const data = result.value.data as any;
    assert.equal(data.taskContinuation.outcome, 'next');
    assert.equal(data.result.id, 1);
    assert.equal(data.result.spiritCost, 5);
  }
  await call({ dungeonName: '试炼', taskInput: '秘境详情 试炼', intentId: 'detail' });
  assert.equal(keys.at(-1), keys.at(-2));
  const before = keys.length;
  assert.equal((await call({ dungeonName: '试炼', taskInput: '秘境详情 其他' })).value.ok, false);
  assert.equal(keys.length, before);
});

test('背包任务返回真实库存实例与推进状态', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current: { category: string; action: string; op: string; command: string; subtype: string };
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    assert.equal(body.taskInput, current.command);
    assert.deepEqual(body.arguments, { args: [current.subtype] });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(inventoryFixtures[current.category]) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of [
    { category: 'prop', action: 'execute_task_prop_inventory', op: 'storage.props', command: '背包 道具 丹药', subtype: '丹药' },
    { category: 'material', action: 'execute_task_material_inventory', op: 'storage.materials', command: '储物袋 材料 草药', subtype: '草药' }
  ]) {
    const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', current.action, { taskInput, intentId: 'inventory' }), 'ai-plugin');
    const result = await call(current.command);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) {
      const data = result.value.data as any;
      assert.equal(data.taskContinuation.outcome, 'next');
      assert.equal(data.result.items[0].userItemId, inventoryFixtures[current.category].data.data.items[0].userItemId);
      assert.equal(data.result.pagination.page, inventoryFixtures[current.category].data.data.pagination.page);
    }
    await call(current.command);
    assert.equal(keys.at(-1), keys.at(-2));
    const before = keys.length;
    assert.equal((await call('背包 不存在')).value.ok, false);
    assert.equal(keys.length, before);
  }
});

test('装备与功法任务返回真实背包实例及推进状态', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current: { kind: string; action: string; op: string; command: string };
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    assert.equal(body.taskInput, current.command);
    assert.deepEqual(body.arguments, { args: [] });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(equipmentInventoryFixtures[current.kind]) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of [
    { kind: 'equipment', action: 'execute_task_equipment_inventory', op: 'storage.equipment', command: '背包 装备' },
    { kind: 'skill', action: 'execute_task_skill_book_inventory', op: 'storage.skill-books', command: '背包 功法' }
  ]) {
    const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', current.action, { taskInput, intentId: 'inventory' }), 'ai-plugin');
    const result = await call(current.command);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) {
      const data = result.value.data as any;
      assert.equal(data.taskContinuation.outcome, 'next');
      assert.equal(data.result.items[0].id, equipmentInventoryFixtures[current.kind].data.data.bag.items[0].id);
    }
    await call(current.command);
    assert.equal(keys.at(-1), keys.at(-2));
    const before = keys.length;
    assert.equal((await call('背包 装备 操作')).value.ok, false);
    assert.equal(keys.length, before);
  }
});

test('天工、本命物和礼盒任务保留真实库存与推进状态', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current: { kind: string; action: string; op: string; command: string };
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.op}`);
    assert.equal(body.taskInput, current.command);
    assert.deepEqual(body.arguments, { args: [] });
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(otherInventoryFixtures[current.kind]) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (current of [
    { kind: 'tool', action: 'execute_task_profession_tool_inventory', op: 'storage.profession-tools', command: '背包 天工' },
    { kind: 'soul', action: 'execute_task_soul_artifact_inventory', op: 'storage.soul-artifacts', command: '背包 本命' },
    { kind: 'lootbox', action: 'execute_task_lootbox_inventory', op: 'storage.lootboxes', command: '背包 礼盒' }
  ]) {
    const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', current.action, { taskInput, intentId: 'inventory' }), 'ai-plugin');
    const result = await call(current.command);
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) {
      const data = result.value.data as any;
      assert.equal(data.taskContinuation.outcome, 'next');
      assert.equal(data.result.items[0].id, otherInventoryFixtures[current.kind].data.data.items[0].id);
    }
    await call(current.command);
    assert.equal(keys.at(-1), keys.at(-2));
    const before = keys.length;
    assert.equal((await call('背包 礼盒 不存在')).value.ok, false);
    assert.equal(keys.length, before);
  }
});

test('背包菜单任务使用真实推进回执并拒绝分类指令', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/storage.menu');
    assert.equal(body.taskInput, '我的纳戒');
    assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(inventoryMenuFixture) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_inventory_menu', { taskInput, intentId: 'menu' }), 'ai-plugin');
  const result = await call('我的纳戒');
  assert.equal(result.value.ok, true, JSON.stringify(result.value));
  if (result.value.ok) assert.equal((result.value.data as any).taskContinuation.outcome, 'next');
  await call('我的纳戒');
  assert.equal(keys.at(-1), keys.at(-2));
  const before = keys.length;
  assert.equal((await call('背包 装备')).value.ok, false);
  assert.equal(keys.length, before);
});

test('AI 连续执行签到和主页任务并保留两步回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const requests: Array<{ path: string; key: string }> = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const path = new URL(request.url).pathname;
    requests.push({ path, key: request.headers['idempotency-key'] });
    const fixture = path === '/api/v2/robot/business/checkin.hub' ? fullChainCheckinFixture : fullChainHomeFixture;
    assert.ok(['/api/v2/robot/business/checkin.hub', '/api/v2/robot/home-overview'].includes(path));
    return { status: 200, headers: {}, data: JSON.stringify(fixture) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const invoke = (action: string, input: object) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
  const checkin = await invoke('checkin_all', { taskInput: '签到', intentId: 'checkin' });
  assert.equal(checkin.value.ok, true, JSON.stringify(checkin.value));
  if (checkin.value.ok) {
    assert.equal((checkin.value.data as any).taskContinuation.command, '我的资料');
    assert.equal((checkin.value.data as any).result[0].status, 'done');
  }
  const home = await invoke('execute_task_home', { taskInput: '我的资料', intentId: 'home' });
  assert.equal(home.value.ok, true, JSON.stringify(home.value));
  if (home.value.ok) {
    assert.equal((home.value.data as any).taskContinuation.outcome, 'completed');
    assert.equal((home.value.data as any).profile.user.id, 1);
  }
  await invoke('checkin_all', { taskInput: '签到', intentId: 'checkin' });
  await invoke('execute_task_home', { taskInput: '我的资料', intentId: 'home' });
  assert.equal(requests[0].key, requests[2].key);
  assert.equal(requests[1].key, requests[3].key);
  assert.notEqual(requests[0].key, requests[1].key);
});


test('每日机缘任务保留群身份并拒绝错步和私聊', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const requests: any[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests.push(request);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/daily-fortune.claim');
    assert.equal(body.messageText, '/每日机缘');
    assert.equal(body.taskInput, '每日机缘');
    assert.equal(body.arguments.target.scope, 'group');
    assert.ok(body.arguments.target.targetId);
    const middleware = { outcome: 'handled', reason: 'TASK', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], taskContinuation: { outcome: 'expected', command: '每日机缘' } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'middleware', middleware } }) };
  } }));
  const group = app.events.groupMessage({ platform: 'qq-bot', userId: 'player' });
  const privateEvent = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (event: typeof group | typeof privateEvent, taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'claim_daily_fortune', { taskInput, intentId: 'fortune' }), 'ai-plugin');
  assert.equal((await call(group, '每日机缘')).value.ok, true);
  assert.equal((await call(group, '签到')).value.ok, false);
  assert.equal((await call(privateEvent, '每日机缘')).value.ok, false);
  assert.equal(requests.length, 1);
});


test('宗门签到任务返回真实结算和推进回执，重试使用原编号', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const requests: any[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests.push(request);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/guild.checkin');
    assert.equal(body.messageText, '/宗门签到');
    assert.equal(body.taskInput, '宗门签到');
    assert.deepEqual(body.arguments, {});
    return { status: 200, headers: {}, data: JSON.stringify(guildCheckinFixture) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'checkin_guild', { taskInput: '宗门签到', intentId: 'guild' }), 'ai-plugin');
  const first = await call();
  assert.equal(first.value.ok, true, JSON.stringify(first.value));
  if (first.value.ok) {
    assert.equal((first.value.data as any).result.receipt.contributionAdded, 50);
    assert.deepEqual((first.value.data as any).taskContinuation, { outcome: 'next', command: '我的资料' });
  }
  await call();
  assert.equal(requests[0].headers['idempotency-key'], requests[1].headers['idempotency-key']);
});


test('月卡任务支持面板实际指令和现有别名', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let expected = ''; let requests = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests++;
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, `/${expected}`); assert.equal(body.taskInput, expected); assert.deepEqual(body.arguments, {});
    const middleware = { outcome: 'handled', reason: 'TASK', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], taskContinuation: { outcome: 'expected', command: expected } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'middleware', middleware } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'claim_month_card_rewards', { taskInput }), 'ai-plugin');
  for (expected of ['月卡领取', '月卡签到', '一键领取', '一键领取月卡']) assert.equal((await call(expected)).value.ok, true);
  assert.equal((await call('其他指令')).value.ok, false); assert.equal(requests, 4);
});


test('新人狂欢任务别名与任务面板指令一致', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let expected = ''; let count = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    count++; const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, `/${expected}`); assert.equal(body.taskInput, expected); assert.deepEqual(body.arguments, {});
    const middleware = { outcome: 'handled', reason: 'TASK', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], taskContinuation: { outcome: 'expected', command: expected } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'middleware', middleware } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (action: string, taskInput: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, { taskInput }), 'ai-plugin');
  for (const [action, commands] of [['execute_task_newcomer_activity', ['初入仙途', '新人狂欢']], ['claim_newcomer_login', ['初入仙途签到', '新人狂欢签到']]] as const) {
    for (expected of commands) assert.equal((await call(action, expected)).value.ok, true);
  }
  assert.equal((await call('claim_newcomer_login', '新人狂欢')).value.ok, false);
  assert.equal((await call('execute_task_newcomer_activity', '新人狂欢签到')).value.ok, false);
  assert.equal(count, 4);
});


test('商店任务保留真实目录和服务端推进回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, '/商店'); assert.equal(body.taskInput, '商店'); assert.deepEqual(body.arguments, { page: 1 });
    return { status: 200, headers: {}, data: JSON.stringify(shopFixture) };
  } }));
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_shop', { taskInput: '商店' }), 'ai-plugin');
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) { const result = run.value.data as any; assert.equal(result.result.page, 1); assert.ok(Array.isArray(result.result.products)); assert.deepEqual(result.taskContinuation, { outcome: 'next', command: '我的资料' }); }
});

test('任务推进后准入失败保留回执且不会报告业务成功', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const middleware = { outcome: 'reject', reason: 'ENTRY_FAILED', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [{ title: '任务执行', heading: '', text: '准入失败，业务未执行；请先核对任务和资源状态。', buttons: [], advice: [] }], contextWarnings: [], taskContinuation: { outcome: 'next', command: '我的资料' } };
  t.mock.method(axios, 'create', () => ({ request: async () => ({ status: 200, headers: {}, data: JSON.stringify({ data: { success: false, branch: 'middleware', middleware } }) }) }));
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'checkin_all', { taskInput: '签到' }), 'ai-plugin');
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) { const result = run.value.data as any; assert.equal(result.success, false); assert.equal(result.branch, 'middleware'); assert.equal(result.result, undefined); assert.equal(result.taskContinuation.outcome, 'next'); assert.equal(result.replies[0].text, middleware.replies[0].text); }
});


test('真实服务端异常回执保留任务推进和结果待核对提示', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/checkin.hub'); assert.equal(body.taskInput, '签到');
    return { status: 200, headers: {}, data: JSON.stringify(unexpectedFixture) };
  } }));
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'checkin_all', { taskInput: '签到' }), 'ai-plugin');
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) { const result = run.value.data as any; assert.equal(result.success, false); assert.equal(result.branch, 'business'); assert.equal(result.result, undefined); assert.deepEqual(result.taskContinuation, { outcome: 'next', command: '我的资料' }); assert.match(result.replies[0].text, /业务结果暂未确认/); }
});


test('我的功法任务使用服务端真实列表及推进回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.taskInput, '我的功法'); assert.deepEqual(body.arguments, { page: null });
    return { status: 200, headers: {}, data: JSON.stringify(learnedTaskFixture) };
  } }));
  const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'player' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_learned_books', { taskInput: '我的功法' }), 'ai-plugin');
  assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) { assert.equal((run.value.data as any).result.total, learnedTaskFixture.data.data.page.total); assert.equal((run.value.data as any).taskContinuation.outcome, 'next'); }
});


test('功法指定显示页沿用服务端查询页规则', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls++; const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, '/我的功法 0002'); assert.deepEqual(body.arguments, { page: '0002' });
    return { status: 200, headers: {}, data: JSON.stringify(learnedPageFixture) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (page: number) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_learned_books', { taskInput: '我的功法 0002', page }), 'ai-plugin');
  const run = await call(2); assert.equal(run.value.ok, true, JSON.stringify(run.value));
  if (run.value.ok) { assert.equal((run.value.data as any).result.currentPage, 1); assert.equal((run.value.data as any).taskContinuation.outcome, 'next'); }
  assert.equal((await call(3)).value.ok, false); assert.equal(calls, 1);
});


test('丹方任务别名和页码规范化保持原始任务步骤', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let expected = ''; let command = ''; let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls++; const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, command); assert.equal(body.taskInput, expected); assert.deepEqual(body.arguments, {});
    const middleware = { outcome: 'handled', reason: 'TASK', identity: { bid: 'player', account: { status: 'registered', playerId: 1 } }, replies: [], contextWarnings: [], taskContinuation: { outcome: 'expected', command: expected } };
    return { status: 200, headers: {}, data: JSON.stringify({ data: { success: true, branch: 'middleware', middleware } }) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const call = (taskInput: string, page?: number) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'execute_task_alchemy_recipes', { taskInput, ...(page === undefined ? {} : { page }) }), 'ai-plugin');
  for (const entry of [{ original: '丹方列表 0002', normalized: '/炼丹 丹方 0002', page: 2 }, { original: '查看丹方', normalized: '/炼丹 丹方', page: 1 }, { original: '炼丹 丹方 3', normalized: '/炼丹 丹方 3', page: 3 }]) {
    expected = entry.original; command = entry.normalized; assert.equal((await call(expected, entry.page)).value.ok, true);
  }
  assert.equal((await call('丹方列表 2', 3)).value.ok, false); assert.equal((await call('炼丹 确认 x')).value.ok, false); assert.equal(calls, 3);
});
