import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { Format, ResultCode, Router, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';
import { getAppConfig } from '../../src/utils/appConfig';
import { useMessage } from '../../src/utils/useMessage';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const dashboard = (level: number) => ({
  access: { canUseProfessionAndCave: true, canJoinAlchemyGuide: level >= 9,
    features: Object.fromEntries(['cave', 'professions', 'alchemy', 'herbalist', 'forge', 'cave-formations', 'meridians'].map(id =>
      [id, { realmReached: ['cave', 'professions'].includes(id) || level >= 9, requiredRealm: '测试门槛', lockedReason: '' }])) },
  alchemy: { unlocked: level >= 9, title: '初阶', level: 1, exp: 0, nextExpRequired: 200, totalCrafts: 0, learnedRecipeCount: 0,
    canAdvance: false, showSection: level >= 9, primaryAction: level >= 9 ? 'recipes' : 'none', equipments: [],
    guide: { active: false, step: null, expiresAt: null, stepLabel: '' } },
  lingzhi: { unlocked: false, title: '', level: 0, exp: 0, nextExpRequired: null, dailyExpGained: 0, dailyExpCap: 50,
    maxPlots: 0, maxFieldGrade: 1, maxFieldGradeLabel: '凡阶', yieldBonus: 0, primaryAction: 'joinGuide' }
});
const team = { teamId: 8, exists: true, leaderName: '清风', memberCount: 1, maxMembers: 6, minRealmName: null, target: null,
  isMember: true, isLeader: true, ownMembershipLeader: true, members: [{ userId: 1, name: '清风', isLeader: true, position: 1 }],
  actions: { canApply: false, canInvite: true, canManageMembers: true, canReviewApplications: true, canUseTeamMail: true,
    canViewDungeon: true, canLeave: false, canDisband: true, canViewInvitations: true } };
const fishing = { rulesVersion: 'prefix-fixture', view: 'overview', title: '洞府垂钓', status: 'idle',
  sections: [{ title: '', id: '', suffix: '', lines: ['尚未垂钓'], actions: [] }], footer: [{ label: '帮助', command: '/垂钓 帮助' }] };
const entries = [
  { command: '洞府', state: 'realm0', op: 'profession.dashboard', input: { includeMeditationPreference: true }, data: dashboard(0), text: '修行静室' },
  { command: '洞府', state: 'realm9', op: 'profession.dashboard', input: { includeMeditationPreference: true }, data: dashboard(9), text: '炼丹室' },
  { command: '我的队伍', state: 'no-team', op: 'teams.overview', input: {}, data: { access: { ok: true, realmName: '炼气九层' }, team: null }, text: '你还没有加入任何队伍' },
  { command: '我的队伍', state: 'joined', op: 'teams.overview', input: {}, data: { access: { ok: true, realmName: '炼气九层' }, team }, text: '清风' },
  { command: '垂钓', state: 'idle', op: 'fishing.query', input: { view: 'overview' }, data: fishing, text: '洞府垂钓' }
];
const delivered = (result: TestRunResult, prefix: string) => {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.ok(view.commands.length > 0 && view.commands.every(command => command.startsWith(prefix)));
  const walk = (nodes: unknown[]) => { for (const raw of nodes) {
    const node = raw as { type: string; value?: unknown; options?: Record<string, unknown> };
    if (node.type === 'MD.button' || node.type === 'Button') {
      assert.notEqual(node.options?.autoEnter, true);
      assert.ok(!Object.hasOwn(node.options ?? {}, 'show'));
      assert.ok([...String(node.options?.data ?? '')].length <= 80);
    }
    if (Array.isArray(node.value)) { walk(node.value); }
  } };
  walk(message.nodes);
  return view;
};

for (const privateChat of [false, true]) for (const form of ['', '/']) for (const entry of entries) {
  test(`默认前缀兼容 ${form}${entry.command} ${entry.state} private=${privateChat}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, entry.data));
    const routes = app.run(createGameRouter);
    await app.mount({ responseRouter: routes.router });
    const text = form + entry.command;
    assert.equal(routes.matchesGameCommand({ name: privateChat ? 'private.message.create' : 'message.create', MessageText: text }), true);
    const event = privateChat ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const view = delivered(await app.dispatch(event), '/');
    assert.ok(view.text.includes(entry.text));
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.op));
    assert.deepEqual(requests[0].body.arguments, entry.input);
  });
}

for (const privateChat of [false, true]) test(`自定义前缀仍独占已注册入口 private=${privateChat}`, async t => {
  let current = entries[0];
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, current.data));
  const config = app.run(getAppConfig);
  app.configure({ processor: { repeated_user_time: 0 }, 'qq-bot': { app_id: '100017' }, 'xiuxian-game': { ...config, commandPrefix: '**' } });
  const routes = app.run(createGameRouter);
  await app.mount({ responseRouter: routes.router });
  for (const entry of [entries[0], entries[2], entries[4]]) {
    current = entry;
    for (const form of ['', '/', '**/']) {
      const text = form + entry.command;
      assert.equal(routes.matchesGameCommand({ name: 'message.create', MessageText: text }), false);
      const result = await app.dispatch(privateChat ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' }));
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 0);
      assert.equal(requests.length, 0);
    }
  }
  for (const entry of [entries[0], entries[2], entries[4]]) {
    current = entry;
    const text = '**' + entry.command;
    const result = await app.dispatch(privateChat ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.ok(delivered(result, '**').text.includes(entry.text));
    assert.ok(requests.at(-1)?.path.endsWith('/' + entry.op));
  }
});

test('默认裸指令仅接受完整已注册别名，未知聊天继续交给其他插件且不请求API', async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('unknown text must not request a game API'); });
  const routes = app.run(createGameRouter);
  await app.mount({ responseRouter: routes.router });
  const downstream = Router.create();
  downstream.res({ events: ['message.create'] }, () => Promise.resolve(async (event: { MessageText?: string }) => {
    await useMessage()[0].send({ format: Format.create().addText(event.MessageText ?? '') });
  }));
  await app.mount({ responseRouter: downstream.define }, undefined, 'other-plugin');
  for (const text of ['我今天想去洞府', '我的队伍今天满了', '洞府很漂亮', '任务面板很好用', '垂钓真好玩', '聊天内容', '/别的插件 参数', '#商店', '//商店']) {
    assert.equal(routes.matchesGameCommand({ name: 'message.create', MessageText: text }), false, text);
    const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.equal(result.messages[0].text, text);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    assert.equal(requests.length, 0);
  }
});

test('裸长别名优先路由，顶层正则入口也兼容且不吞相邻聊天', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined,
    [{ title: '', heading: '', text: '已匹配原入口', buttons: [], advice: [] }]));
  const routes = app.run(createGameRouter);
  await app.mount({ responseRouter: routes.router });
  for (const [command, op] of [['我的队伍申请', 'teams.my-applications'], ['我的队伍邀请', 'teams.invitations'], ['任务面板', 'task-panel.view']]) {
    assert.equal(routes.matchesGameCommand({ name: 'message.create', MessageText: command }), true);
    const result = await app.dispatch(app.events.groupMessage({ text: command, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.ok(inspectMessage(result.messages[0].nodes).text.includes('已匹配原入口'));
    assert.ok(requests.at(-1)?.path.endsWith('/' + op), `${command}: ${requests.at(-1)?.path}`);
  }
  assert.equal(requests.length, 3);
});

test('私聊客服入口不把已注册裸游戏指令发送为客服正文', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, dashboard(9)));
  const config = app.run(getAppConfig);
  app.configure({ processor: { repeated_user_time: 0 }, 'qq-bot': { app_id: '100017' }, 'xiuxian-game': {
    ...config, support_api_origin: config.backend?.api_url, backend: { ...config.backend, channel_mode: true }
  } });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  assert.ok(delivered(await app.dispatch(app.events.privateMessage({ text: '洞府', platform: 'qq-bot', botId: '100017' })), '/').text.includes('我的洞府'));
  assert.equal(requests.length, 1);
  assert.ok(requests[0].path.endsWith('/profession.dashboard'));
});
