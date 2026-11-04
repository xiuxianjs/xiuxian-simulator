import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import { Expose, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import handler from '../../src/response/fishing/res';
import { parseFishingCommand } from '../../src/response/fishing/commands';
import { parseFishingView, validFishingWeek } from '../../src/api/bot/fishing';
import { createGameRouter } from '../../src/router';
import { getAppConfig } from '../../src/utils/appConfig';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
import { businessEnvelope, gameFixture } from './fixture';

const eventId = 'fb_' + 'a'.repeat(32);
const battleId = 'fba_' + 'b'.repeat(32);
const week = '2026-11-02';
const ref = 'r1_1_y_mh9of000_0123456789abcdef01234567';
const actualBoss = JSON.parse(readFileSync(new URL('../fixtures/fishing-boss-views-actual.json', import.meta.url), 'utf8'));
const actualContest = JSON.parse(readFileSync(new URL('../fixtures/fishing-contest-views-actual.json', import.meta.url), 'utf8'));
const captures: { name: string; messages: TestRunResult['messages'] }[] = [];
after(async () => {
  if (process.env.FISHING_EVENTS_PREVIEW_OUTPUT) {
    writeFileSync(process.env.FISHING_EVENTS_PREVIEW_OUTPUT, JSON.stringify({ source: 'Real QQ handler/Hook/Format; actual-boss and actual-contest captures use isolated Go service exports, other cases use independent presentation-contract backend fixtures; no platform delivery', captures }, null, 2));
  }
  await shutdownLogger();
});
const action = (label: string, command: string) => ({ label, command });
const section = (title: string, lines: string[], actions: ReturnType<typeof action>[] = []) => ({ title, lines, actions });
const view = (kind: string, changes: Record<string, unknown> = {}) => ({ rulesVersion: 'fishing-events-contract-fixture', view: kind, title: '垂钓奇遇与钓仙会', status: 'open',
  sections: [section('', ['状态：独立展示契约夹具'])], footer: [action('返回垂钓', '/垂钓')], ...changes });
function delivered(result: TestRunResult, name: string) {
  assert.deepEqual(result.errors, []); assert.equal(result.messages.length, 1);
  for (const message of result.messages) {
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const walk = (nodes: unknown[]) => { for (const raw of nodes) {
      const node = raw as { type: string; value?: unknown; options?: Record<string, unknown> };
      if (node.type === 'MD.button' || node.type === 'Button') {
        if (node.type === 'MD.button') { assert.equal(node.options?.autoEnter, false); } else { assert.notEqual(node.options?.autoEnter, true); }
        assert.ok(!Object.hasOwn(node.options ?? {}, 'show'));
        assert.ok([...String(node.options?.data ?? '')].length <= 80);
      }
      if (Array.isArray(node.value)) { walk(node.value); }
    } }; walk(message.nodes);
  }
  captures.push({ name, messages: result.messages });
  return inspectMessage(result.messages[0].nodes);
}

const queryCases = [
  ['/垂钓 奇遇', { view: 'boss' }],
  [`/垂钓 奇遇 ${eventId}`, { view: 'boss', eventId }],
  ['/垂钓 奇遇掉落', { view: 'boss-drops' }],
  [`/垂钓 奇遇掉落 ${eventId}`, { view: 'boss-drops', eventId }],
  [`/垂钓 奇遇战报 ${battleId}`, { view: 'boss-battle', battleId, page: 1 }],
  [`/垂钓 奇遇战报 ${battleId} 3`, { view: 'boss-battle', battleId, page: 3 }],
  [`/垂钓 奇遇奖励 ${eventId}`, { view: 'boss-rewards', eventId }],
  ['/垂钓 大赛', { view: 'contest' }],
  [`/垂钓 大赛 ${week}`, { view: 'contest', week }],
  ['/垂钓 鱼榜 fishing_r2_a', { view: 'contest-species', speciesId: 'fishing_r2_a', page: 1 }],
  [`/垂钓 鱼榜 fishing_r2_a 2 ${week}`, { view: 'contest-species', speciesId: 'fishing_r2_a', page: 2, week }],
  ['/垂钓 积分榜', { view: 'contest-ranking', page: 1 }],
  [`/垂钓 积分榜 3 ${week}`, { view: 'contest-ranking', page: 3, week }],
  ['/垂钓 赛奖', { view: 'contest-rewards' }],
  [`/垂钓 赛奖 ${week}`, { view: 'contest-rewards', week }],
  ['/垂钓 赛史', { view: 'contest-history', page: 1 }],
  ['/垂钓 赛史 2', { view: 'contest-history', page: 2 }]
] as const;
for (const [command, input] of queryCases) test('奇遇赛事短命令真实HTTP往返 ' + command, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, view(input.view)));
  delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), command);
  assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/fishing.query'));
  assert.deepEqual(requests[0].body.arguments, input);
});

for (const key of ['active', 'drops', 'preview', 'result', 'battle', 'rewards']) test('Go实际Boss隔离服务六页经QQ处理器原文发送 ' + key, async t => {
  const cases = actualBoss.cases;
  const actions = (data: { sections: { actions?: { command: string }[] }[]; footer: { label: string; command: string }[] }) => [
    ...data.sections.flatMap(section => section.actions ?? []), ...data.footer
  ];
  const activeCommands = actions(cases.active).map(action => action.command);
  const originalEventId = activeCommands.find(command => command.startsWith('/垂钓 挑战 '))!.split(' ').at(-1)!;
  const command = key === 'active' ? '/垂钓 奇遇 ' + originalEventId
    : key === 'drops' ? activeCommands.find(command => command.startsWith('/垂钓 奇遇掉落 '))!
    : key === 'preview' ? activeCommands.find(command => command.startsWith('/垂钓 挑战 '))!
    : key === 'result' ? '/垂钓 确认 ' + cases.preview.confirmationRef
    : actions(cases.result).map(action => action.command).find(command => command.startsWith(key === 'battle' ? '/垂钓 奇遇战报 ' : '/垂钓 奇遇奖励 '))!;
  const parsed = parseFishingCommand(command);
  assert.ok(parsed && !('error' in parsed));
  const data = cases[key];
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
  const page = delivered(result, 'actual-boss-' + key);
  assert.ok(page.text.includes(data.title));
  for (const section of data.sections) { for (const line of section.lines) { assert.ok(page.text.includes(line)); } }
  assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + parsed.operation));
  assert.deepEqual(requests[0].body.arguments, parsed.input);
  assert.ok(!/native_seed|boss_snapshot_json|reward_seed|participants_json/.test(page.text));
  if (key === 'battle') {
    assert.ok(page.text.includes('上古龙鲤 受到'));
    assert.ok(!page.text.includes('fishing_boss_fixture'));
  }
  if (key === 'active') {
    const markdown = result.messages[0].nodes.find(node => node.type === 'Markdown');
    assert.ok(markdown && Array.isArray(markdown.value));
    const quotes = markdown.value.filter(node => node.type === 'MD.blockquote');
    assert.equal(quotes.length, 2);
    assert.ok(JSON.stringify(quotes[0]).includes('挑战队伍'));
    assert.ok(JSON.stringify(quotes[0]).includes('人数：2 / 6人'));
    assert.ok(JSON.stringify(quotes[1]).includes('奖励归属'));
    assert.ok(page.commands.includes('/我的队伍'));
    assert.equal(data.footer.length, 3);
    assert.ok(!page.text.includes('水域1级'));
  }
});

for (const key of ['contest', 'contest-species', 'contest-ranking', 'contest-rewards', 'contest-history', 'contest-receipt']) test('Go实际周赛Query和Claim六页经QQ处理器原文发送 ' + key, async t => {
  const rewardActions = actualContest['contest-rewards'].sections.flatMap((section: { actions?: { command: string }[] }) => section.actions ?? []);
  const claimCommand = rewardActions.map((action: { command: string }) => action.command).find((command: string) => command.startsWith('/垂钓 赛领奖 '));
  assert.ok(claimCommand);
  const originalWeek = claimCommand.split(' ').at(-1)!;
  const data = actualContest[key];
  const command = key === 'contest' ? '/垂钓 大赛'
    : key === 'contest-species' ? data.navRows[0][0].command
    : key === 'contest-ranking' ? actualContest.contest.footer.find((action: { label: string }) => action.label === '积分榜').command
    : key === 'contest-rewards' ? '/垂钓 赛奖 ' + originalWeek
    : key === 'contest-history' ? '/垂钓 赛史 1' : claimCommand;
  const parsed = parseFishingCommand(command);
  assert.ok(parsed && !('error' in parsed));
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
  const page = delivered(result, 'actual-' + key);
  assert.ok(page.text.includes(data.title));
  for (const section of data.sections) { for (const line of section.lines) { assert.ok(page.text.includes(line)); } }
  assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + parsed.operation));
  assert.deepEqual(requests[0].body.arguments, parsed.input);
  if (key === 'contest-species') {
    assert.deepEqual(data.navRows.map((row: unknown[]) => row.length), [3, 2]);
    assert.ok(page.text.indexOf('金须鲤') < page.text.indexOf('第1名'));
  }
  if (key === 'contest') {
    const markdown = result.messages[0].nodes.find(node => node.type === 'Markdown');
    assert.ok(markdown && Array.isArray(markdown.value));
    const quotes = markdown.value.filter(node => node.type === 'MD.blockquote');
    assert.equal(quotes.length, 1);
    for (const name of data.emphasisNames) { assert.ok(JSON.stringify(quotes[0]).includes(name)); }
    assert.ok(!page.text.includes('本功能启用'));
  }
  for (const generated of page.commands.filter(command => command.startsWith('/垂钓'))) {
    const roundTrip = parseFishingCommand(generated);
    assert.ok(roundTrip && !('error' in roundTrip), generated);
  }
});

test('Boss原预览按钮确认两次均只提交原R1，不重查名单或另开战斗', async t => {
  const preview = view('boss', { title: '上古龙鲤 · 挑战预览', confirmationRef: ref, operationId: 'boss-attempt-original', expiresAt: '2026-11-05T23:00:00+08:00',
    sections: [section('', ['境界：筑基 · 大圆满', '事件队长：清风（固定）', '本次参战：清风、霁月、玄尘', '本次为第1次挑战，最多3次。']),
      section('参战奖励', ['每位参战者钓技经验＋200，不均分；满级封顶。', '触发者获得完整掉落，队员各获额外钱物。'])],
    footer: [action('确认挑战', '/垂钓 确认 ' + ref), action('取消', '/垂钓 奇遇 ' + eventId)] });
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('fishing.preview') ? preview : view('boss-battle', { title: '上古龙鲤 · 挑战战报', sections: [section('', ['结果：胜利'])] })));
  const page = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 挑战 ' + eventId, platform: 'qq-bot' })), 'Boss挑战预览');
  assert.deepEqual(requests[0].body.arguments, { kind: 'boss-challenge', eventId });
  assert.ok(page.text.includes('清风、霁月、玄尘')); assert.ok(page.text.includes('5分钟'));
  const command = page.commands.find(command => command.startsWith('/垂钓 确认 '))!;
  assert.equal(command, '/垂钓 确认 ' + ref);
  for (let i = 0; i < 2; i++) { delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), 'Boss原引用确认'); }
  assert.deepEqual(requests.slice(1).map(request => request.body.arguments), [{ ref }, { ref }]);
  assert.ok(requests.slice(1).every(request => request.path.endsWith('/fishing.confirm')));
});

test('Boss奖励与赛事标签逐字保留服务端事实，多物品名称加深不在客户端分奖或算分', async t => {
  const data = view('boss-rewards', { title: '上古龙鲤 · 奖励回执', emphasisNames: ['水灵砂', '凝灵丹'], sections: [
    section('清风 · 触发者奖励', ['灵鳞钱＋3,300', '水灵砂×6 · 凝灵丹×1', '钓技经验＋200']),
    section('霁月 · 额外助战奖励', ['灵鳞钱＋330', '水灵砂×1', '钓技经验＋200'])] });
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 奇遇奖励 ' + eventId, platform: 'qq-bot' }));
  const page = delivered(result, 'Boss奖励原文');
  for (const block of data.sections) { for (const line of block.lines) { assert.ok(page.text.includes(line)); } }
  const nodes = JSON.stringify(result.messages[0].nodes);
  assert.match(nodes, /"type":"MD.bold","value":"水灵砂"/); assert.match(nodes, /"type":"MD.bold","value":"凝灵丹"/);
});

test('赛事原生标签和服务端分页完整往返，不改历史周或客户端计算排名', async t => {
  const next = `/垂钓 鱼榜 fishing_r2_a 2 ${week}`;
  const data = view('contest-species', { title: '沧澜钓仙会 · 铁鳞鲫', sections: [section('', ['赛区：筑基', '每人每种取本周最重一条。']), section('第1名 · 清风', ['重量：3.840kg · 20分'])],
    navRows: [[action('铁鳞鲫', `/垂钓 鱼榜 fishing_r2_a 1 ${week}`), action('金须鲤', `/垂钓 鱼榜 fishing_r2_b 1 ${week}`)]],
    nav: { page: 1, totalPages: 3, total: 12, command: `/垂钓 鱼榜 fishing_r2_a {page} ${week}` } });
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const page = delivered(await app.runHandler(handler, app.events.privateMessage({ text: `/垂钓 鱼榜 fishing_r2_a 1 ${week}`, platform: 'qq-bot' })), '赛事鱼种榜');
  assert.ok(page.text.indexOf('每人每种') < page.text.indexOf('金须鲤'));
  assert.ok(page.text.indexOf('金须鲤') < page.text.indexOf('第1名'));
  assert.ok(page.commands.includes(next));
  delivered(await app.runHandler(handler, app.events.privateMessage({ text: next, platform: 'qq-bot' })), '赛事原周翻页');
  assert.deepEqual(requests[1].body.arguments, { view: 'contest-species', speciesId: 'fishing_r2_a', page: 2, week });
});

test('显式quote支持匿名引用与普通行，缺省保持旧对象引用且拒绝非布尔值', async t => {
  const data = view('boss-drops', { sections: [
    { ...section('', ['灵鳞钱：必得2,000～4,000钱']), quote: true },
    { ...section('事件说明', ['触发者获得完整掉落。']), quote: false },
    section('旧版对象', ['状态：缺省规则保留'])
  ] });
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 奇遇掉落 ' + eventId, platform: 'qq-bot' }));
  const page = delivered(result, '显式引用与旧版兼容');
  const markdown = result.messages[0].nodes.find(node => node.type === 'Markdown');
  assert.ok(markdown && Array.isArray(markdown.value));
  const quotes = markdown.value.filter(node => node.type === 'MD.blockquote');
  assert.equal(quotes.length, 2);
  assert.ok(JSON.stringify(quotes[0]).includes('灵鳞钱：必得2,000～4,000钱'));
  assert.ok(JSON.stringify(quotes[1]).includes('旧版对象'));
  assert.ok(!JSON.stringify(quotes).includes('事件说明'));
  assert.ok(page.text.includes('触发者获得完整掉落。'));
  assert.throws(() => parseFishingView(view('boss', { sections: [{ ...section('', []), quote: 1 }] })));
});

test('周赛领奖直接调用独立写RPC，原平台重试保持周键和幂等键', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, view('contest-history', { title: '沧澜钓仙会 · 奖励回执', sections: [section('', ['状态：已领取', '奖励：1,000灵鳞钱'])] })));
  const event = app.events.privateMessage({ text: '/垂钓 赛领奖 ' + week, platform: 'qq-bot', messageId: 'contest-original-message' });
  for (let i = 0; i < 2; i++) { delivered(await app.runHandler(handler, event), '周赛原周领奖'); }
  assert.equal(requests.length, 2); assert.ok(requests.every(request => request.path.endsWith('/fishing.contest-claim')));
  assert.deepEqual(requests.map(request => request.body.arguments), [{ week }, { week }]);
  assert.equal(requests[0].idempotencyKey, requests[1].idempotencyKey);
});

test('周赛领奖响应不完整时核对原奖励，不误导成缺少预览或偷偷重发', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {}));
  const page = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓 赛领奖 ' + week, platform: 'qq-bot' })), '周奖原结果待核对');
  assert.ok(!page.text.includes('未取得原预览')); assert.equal(requests.length, 1);
});

test('最大合法奇遇编号和页码完整按钮往返，命令不截断且不超80字符', async t => {
  const maximum = 'f'.repeat(40);
  const command = `/垂钓 奇遇战报 ${maximum} 2147483647`;
  assert.ok([...command].length <= 80);
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, view('boss-battle', { footer: [action('查看战报', command)] })));
  const page = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), '最大奇遇参数');
  assert.ok(page.commands.includes(command)); assert.deepEqual(requests[0].body.arguments, { view: 'boss-battle', battleId: maximum, page: 2147483647 });
});

for (const command of [`/垂钓 挑战 ${'a'.repeat(41)}`, '/垂钓 挑战', '/垂钓 奇遇 bad/ID', '/垂钓 奇遇战报', '/垂钓 奇遇奖励',
  '/垂钓 赛领奖', '/垂钓 赛领奖 上周', '/垂钓 赛领奖 2026-11-03', '/垂钓 大赛 2026-02-30', '/垂钓 鱼榜', '/垂钓 积分榜 0', `/垂钓 确认 ${ref.slice(0, -1)}`]) {
  test('奇遇赛事拒绝损坏或缺失参数且零API ' + command, async t => {
    const { app, requests } = await gameFixture(t, () => { throw Error('Invalid command must not call backend'); });
    const page = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })), '奇遇赛事无效参数');
    assert.ok(page.text.includes('参数错误')); assert.equal(requests.length, 0);
  });
}

for (const prefix of ['/', '**']) test('奇遇赛事沿真实已注册垂钓路由，保留当前前缀 ' + prefix, async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, view('contest')));
  const config = app.run(getAppConfig);
  app.configure({ processor: { repeated_user_time: 0 }, 'qq-bot': { app_id: '100017' }, 'xiuxian-game': { ...config, commandPrefix: prefix === '/' ? undefined : prefix } });
  const routes = app.run(createGameRouter); await app.mount({ responseRouter: routes.router });
  for (const text of prefix === '/' ? ['垂钓 大赛', '/垂钓 大赛'] : ['**垂钓 大赛']) {
    delivered(await app.dispatch(app.events.privateMessage({ text, platform: 'qq-bot' })), '新赛事真实路由');
  }
  assert.ok(requests.every(request => request.path.endsWith('/fishing.query')));
});

test('expose新增查询字段及Boss原预览，领奖是独立授权写操作', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('fishing.preview')
    ? view('boss', { confirmationRef: ref, operationId: 'boss-original', expiresAt: '2026-11-05T23:00:00+08:00' }) : view('contest-history')));
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player', messageId: 'contest-expose-original' });
  const call = (name: string, input: Record<string, unknown>) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', name, input), 'ai-plugin');
  for (const input of [{ view: 'boss-battle', battleId, page: 2 }, { view: 'boss-rewards', eventId }, { view: 'contest-ranking', week, page: 3 }]) {
    const result = await call('get_fishing', input); assert.equal(result.value.ok, true, JSON.stringify(result.value));
    assert.deepEqual(requests.at(-1)?.body.arguments, input);
  }
  const preview = await call('preview_fishing_action', { kind: 'boss-challenge', eventId });
  assert.equal(preview.value.ok, true, JSON.stringify(preview.value)); assert.deepEqual(requests.at(-1)?.body.arguments, { kind: 'boss-challenge', eventId });
  for (let i = 0; i < 2; i++) { const claim = await call('claim_fishing_contest', { week }); assert.equal(claim.value.ok, true, JSON.stringify(claim.value)); }
  assert.deepEqual(requests.slice(-2).map(request => request.body.arguments), [{ week }, { week }]);
  assert.equal(requests.at(-1)?.idempotencyKey, requests.at(-2)?.idempotencyKey);
  assert.ok(requests.at(-1)?.path.endsWith('/fishing.contest-claim'));
});

test('expose奇遇越权参数、缺编号和非周一领奖拒绝且零后端访问', async t => {
  const { app, requests } = await gameFixture(t, () => { throw Error('Invalid expose must not request'); });
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player', messageId: 'contest-expose-invalid' });
  for (const [name, input] of [['get_fishing', { view: 'boss', eventId, uid: 2 }], ['get_fishing', { view: 'boss', eventId: 'a'.repeat(41) }],
    ['preview_fishing_action', { kind: 'boss-challenge' }], ['claim_fishing_contest', { week: '2026-11-03' }], ['claim_fishing_contest', { week, userId: 2 }]] as const) {
    const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', name, input), 'ai-plugin');
    assert.equal(result.value.ok, false);
  }
  assert.equal(requests.length, 0);
  assert.equal(validFishingWeek('2026-11-02'), true); assert.equal(validFishingWeek('2026-02-30'), false);
  assert.equal(parseFishingView(view('boss-rewards')).view, 'boss-rewards');
  assert.deepEqual(parseFishingCommand('/垂钓 赛领奖 ' + week), { operation: 'fishing.contest-claim', input: { week } });
});
