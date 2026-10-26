import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import game from '../src/index.ts';
import { requestRobotBusiness, parseRobotBusinessEnvelope } from '../src/api/bot/robot-business.ts';
import { parseBackendRegistration } from '../src/api/bot/registration.ts';
import { parseOnboarding } from '../src/api/bot/onboarding.ts';
import { backendConnectionPools } from '../src/api/bot/connection-pools.ts';
import { showOnboarding } from '../src/response/onboarding/context.ts';
import resGuide from '../src/response/resGuide.ts';

// The Go parent owns disposable SQLite/miniredis and checks the final ledgers.
// Real bot lifecycle, router, Context, Format and send receipts run here.
test('real bot HTTP bridge to isolated Go registration fixture', { skip: !process.env.ONBOARDING_BRIDGE_URL }, async () => {
  const url = new URL(process.env.ONBOARDING_BRIDGE_URL);
  assert.equal(url.protocol, 'http:');
  assert.equal(url.hostname, '127.0.0.1', 'bridge must never target a configured backend');
  const early = Number(process.env.ONBOARDING_BRIDGE_RETURN_MINUTES) === 150;
  const manualPill = process.env.ONBOARDING_BRIDGE_MANUAL_PILL === '1';
  mock.timers.enable({ apis: ['setTimeout'] });
  const app = createTestApp({ config: {
    processor: { repeated_user_time: 0 },
    'xiuxian-game': { backend: { api_url: url.href, robot_auth_token: 'secret', api_timeout_ms: 10000 } }
  } });
  let sequence = 0;
  let latest;
  let bubbles = 0;
  let middleware;
  const options = text => ({ text, userId: process.env.ONBOARDING_BRIDGE_BID, groupId: process.env.ONBOARDING_BRIDGE_REGION, botId: 'bridge-bot', platform: 'qq-bot', messageId: `bridge-${++sequence}` });
  const event = text => app.events.groupMessage(options(text));
  const remember = result => {
    assert.deepEqual(result.errors, []);
    for (const message of result.messages) {
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok, 'platform send must succeed');
      latest = message;
      bubbles++;
    }
    return result;
  };
  const text = () => inspectMessage(latest.nodes).text;
  const raw = () => JSON.stringify(latest.nodes);
  const request = async (text, operation, args = {}, decode = parseOnboarding) => {
    const e = event(text);
    const result = await app.invoke(e, () => requestRobotBusiness(e, operation, args, decode));
    remember(result);
    return result.value;
  };
  const read = async () => {
    const result = await request('/继续引导', 'onboarding.view');
    assert.equal(result.success, true); assert.equal(result.branch, 'business');
    middleware = result.middleware;
    return result.data;
  };
  const show = async view => {
    const e = event('/继续引导');
    remember(await app.invoke(e, () => showOnboarding(e, view)));
  };
  const dispatch = async command => remember(await app.dispatch(event(command)));
  const deliverCallback = async button => {
    const command = button.options.data;
    const e = app.events.interaction(options(command), {
      InteractionId: `interaction-${sequence}`,
      InteractionData: JSON.stringify({ button_id: button.options.rawData.id, button_data: command })
    });
    remember(await app.dispatch(e));
  };
  const buttons = () => {
    const found = [];
    const walk = nodes => { for (const node of nodes) { if (node.type === 'Button' || node.type === 'MD.button') found.push(node); if (Array.isArray(node.value)) walk(node.value); } };
    walk(latest.nodes);
    return found;
  };
  const choose = async (view, command, rendered = true) => {
    const index = view.actions.findIndex(action => action.command === command);
    assert.ok(index >= 0, `unavailable choice ${command}`);
    const id = `ob${view.version.toString(36)}.${index}`;
    if (rendered) assert.ok(buttons().some(button => button.options?.rawData?.id === id), raw());
    await deliverCallback({ options: { data: command, rawData: { id } } });
    assert.ok(text().includes(`你选择了：${command}`), text());
    assert.ok(!text().includes('连接暂时中断'), text());
    return read();
  };
  try {
    await app.mount(game);
    for (const [i, command] of ['/踏入仙途', '/我是 初行', '/我是 初行 女'].entries()) {
      const result = await request(command, 'account.register', { region: process.env.ONBOARDING_BRIDGE_REGION }, parseBackendRegistration);
      assert.equal(result.success, true); assert.equal(result.branch, 'business');
      assert.equal(result.data.code, ['NEED_NAME', 'NEED_GENDER', 'OK'][i]);
    }
    const e = event('/跳过引导');
    const prologue = (await app.invoke(e, () => requestRobotBusiness(e, 'guide.skip', {}, () => { throw new Error('prologue must use middleware'); }))).value;
    assert.equal(prologue.branch, 'middleware'); assert.equal(prologue.middleware.guide.action, 'skipped');
    remember(await app.invoke(e, () => resGuide(e, prologue.middleware)));
    assert.ok(raw().includes('/签到'), raw());
    let view = await read();
    assert.equal(view.phase, 'checkin');
    const first = view;
    view = await choose(view, '/签到');
    assert.equal(view.phase, 'chapter');
    view = await choose(first, '/签到', false);
    assert.equal(view.phase, 'chapter'); assert.equal(view.version, first.version + 1);
    const beforeExitVersion = view.version;
    const exited = await request('/退出引导', 'onboarding.exit');
    assert.equal(exited.data.status, 'exited'); await show(exited.data);
    const stillExited = await request('/任务面板', 'onboarding.view');
    assert.equal(stillExited.data.status, 'exited');
    view = await read(); assert.equal(view.status, 'active'); assert.equal(view.phase, 'chapter');
    assert.ok(view.version > beforeExitVersion); await show(view);
    const trace = ['/签到'];
    for (let steps = 0; view.status !== 'completed' && steps < 64; steps++) {
      const action = view.actions.find(action => action.command === '/领取宝箱 1') ?? view.actions.find(action => action.command === '/闭关') ?? view.actions[0];
      assert.ok(action, `stuck at ${JSON.stringify(view)}`);
      trace.push(action.command); view = await choose(view, action.command);
    }
    assert.equal(view.status, 'completed');
    assert.deepEqual(view.actions.map(action => action.command), ['/闭关', '/任务面板']);
    assert.ok(text().includes('查看本轮积累'), text()); assert.ok(text().includes('尚未满15分钟'), text());
    assert.equal(trace.filter(command => command === '/签到').length, 1);
    assert.equal(trace.filter(command => command.startsWith('/主线挑战')).length, 1);
    assert.equal(trace.filter(command => command.startsWith('/主线扫荡')).length, 1);
    const returnResponse = await fetch(new URL('/__test/return', url), { method: 'POST' });
    assert.equal(returnResponse.status, 200); const preview = await returnResponse.json();
    assert.equal(preview.xp, early ? 40 : 128);
    const counts = async () => (await fetch(new URL('/__test/counts', url))).json();
    const before = await counts(); const returnTrace = [];
    for (const [command, receipt, next] of [
      ['/出关', `本次获得修为：${preview.xp}`, early ? '/服用 精力丹 2' : '/主线扫荡 1-1 7'],
      ...(early ? [['/服用 精力丹 2', '50 → 110 (+60)', '/主线扫荡 1-1 11']] : []),
      [early ? '/主线扫荡 1-1 11' : '/主线扫荡 1-1 7', early ? '消耗精力：110' : '消耗精力：70', '/突破'],
      ['/突破', '当前境界：炼气三层', '/我的境界']
    ]) {
      const button = buttons().find(button => button.type === 'Button' && button.options.type === 'call' && button.options.data === command);
      const beforeBubbles = bubbles;
      if (button && !(manualPill && command.startsWith('/服用'))) await deliverCallback(button);
      else await dispatch(command);
      assert.equal(bubbles, beforeBubbles + 1, 'receipt and next step share one bubble');
      assert.ok(text().includes(receipt), text());
      if (command === '/出关') assert.ok(text().includes(`本次获得真气：${preview.qi}`), text());
      assert.deepEqual(buttons().map(button => button.options.data), [next, '/任务面板']);
      if (command.startsWith('/主线扫荡') || command.startsWith('/服用 精力丹')) {
        assert.ok(button, 'bound choice is required for deliberate replay');
        await deliverCallback(button);
        assert.ok(text().includes('没有重复执行旧按钮'), text());
        assert.deepEqual(buttons().map(button => button.options.data), [next, '/任务面板']);
      }
      returnTrace.push(command);
    }
    const after = await counts();
    assert.equal((after['meditation.end'] ?? 0) - (before['meditation.end'] ?? 0), 1);
    assert.equal(after['onboarding.action'] - before['onboarding.action'], early ? (manualPill ? 4 : 5) : 3);
    assert.equal((after['items.consume'] ?? 0) - (before['items.consume'] ?? 0), manualPill ? 1 : 0);
    assert.equal(after['onboarding.view'], before['onboarding.view'], 'followup must not read the course again');
    const businessTotal = values => Object.entries(values).filter(([key]) => !key.startsWith('HTTP ')).reduce((sum, [, count]) => sum + count, 0);
    assert.equal(businessTotal(after) - businessTotal(before), early ? 6 : 4, 'only deliberate gameplay requests and replay checks');
    assert.ok(after['HTTP /api/v1/content/tianshu'] > 1, 'real startup and send-time feature checks must run');
    for (const bad of [{}, null, { ...view, status: 'active' }, { ...view, actions: [{}, {}, {}] }]) {
      const parsed = parseRobotBusinessEnvelope({ success: true, branch: 'business', middleware, data: { committed: true }, onboarding: bad }, process.env.ONBOARDING_BRIDGE_BID, data => data);
      assert.equal(parsed.data.committed, true); assert.equal(parsed.onboardingPending, true); assert.equal(parsed.onboarding, undefined);
    }
    console.log(JSON.stringify({ result: 'PASS', realHTTP: true, nativeFramework: true, commands: trace, returnCommands: returnTrace, bubbles }));
  } finally {
    await app.dispose(); mock.timers.reset(); await shutdownLogger();
    backendConnectionPools.httpAgent.destroy(); backendConnectionPools.httpsAgent.destroy();
  }
});
