import { activeDesign } from '../../src/expose/active-design';
import { parseBackendTianshuContent } from '../../src/api/bot/tianshu-content';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
import handler from '../../src/response/tianshu/res';
import { goalEvidence } from '../../src/agent-play/goal-evidence';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessBooksPublicAndAdmission$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).toString();
const fixtures = [...output.matchAll(/ROBOT_BOOKS_RESPONSE=tianshu.content\|\{\}\|([^|]+)\|(.+)/g)].map(row => ({ bid: row[1], envelope: JSON.parse(row[2]) }));
assert.ok(fixtures.some(row => row.bid === 'player') && fixtures.some(row => row.bid === 'guest-books'));
for (const bid of ['player', 'guest-books']) test(`天书查询：${bid}`, async t => {
  const fixture = fixtures.find(row => row.bid === bid)!;
  const supported = activeDesign(parseBackendTianshuContent(structuredClone(fixture.envelope.data.data)));
  assert.doesNotMatch(JSON.stringify(supported), /宗门大比|黑盒|海外仙岛|个人小店/u);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, '/api/v2/robot/business/tianshu.content');
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.messageText, '/天书');
    assert.deepEqual(body.arguments, {});
    keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(fixture.envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: bid });
  const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_tianshu', {}), 'ai-plugin');
  const response = await call();
  assert.equal(response.value.ok, true, JSON.stringify(response.value));
  if (response.value.ok) {
    const data = (response.value.data as any).result;
    assert.equal(data.intro, fixture.envelope.data.data.intro);
    const expected: any = structuredClone(supported.featureCatalog);
    for (const stage of expected) for (const feature of stage.features) if (feature.entryPaths === null) delete feature.entryPaths;
    assert.deepEqual(data.featureCatalog, expected);
    assert.equal(data.commandFeatures.length, Object.keys(supported.commandFeatures ?? {}).length);
  }
  await call();
  assert.notEqual(keys[0], keys[1]);
  if (bid === 'player') {
    const prepared = await app.invoke(event, () => goalEvidence('帮我提升境界', new Map([['get_tianshu', {
      name: 'expose_write',
      execute: args => Expose.create().call(String(args.protocol), String(args.provider), String(args.action), JSON.parse(String(args.argumentsJson)))
    }]]), { signal: new AbortController().signal }, () => false), 'ai-plugin');
    const prompt = prepared.value;
    const evidence = JSON.parse(prompt.slice(prompt.indexOf('{'), prompt.lastIndexOf('}') + 1));
    const receipt = evidence.facts[0].result;
    assert.equal(receipt.ok, true);
    assert.equal(receipt.data.success, true);
    assert.equal(receipt.data.branch, 'business');
    assert.equal(receipt.data.result.intro, fixture.envelope.data.data.intro);
    assert.deepEqual(receipt.data.result.notes, supported.notes);
    assert.deepEqual(receipt.data.result.currentStage, supported.currentStage);
    assert.deepEqual(receipt.data.result.nextStage, supported.nextStage);
    assert.equal(keys.length, 3, 'Preparing design evidence must call the actual observation once');
    assert.notEqual(keys[1], keys[2]);
  }
});
test('天书非本包指令继续事件链', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  for (const text of ['/天书工具', '/其他命令', '天书介绍']) {
    const result = await app.runHandler(handler, app.events.groupMessage({ platform: 'qq-bot', text }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.nextCalls.length, 1);
    assert.equal(result.messages.length, 0);
  }
});


test('实际炼气目录逐页压缩并以气泡按钮翻页', async t => {
  const fixture = fixtures.find(row => row.bid === 'player')!;
  const app = createTestApp({
    config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } }
  });
  t.after(() => app.dispose());
  t.mock.method(axios, 'create', () => ({ request: async () => ({ status: 200, headers: {}, data: JSON.stringify(fixture.envelope) }) }));

  const layers = [
    ['炼气一层', '炼气二层'],
    ['炼气三层', '炼气四层'],
    ['炼气五层', '炼气七层'],
    ['炼气九层']
  ];
  let text = '/天书 炼气';
  for (const [index, expectedLayers] of layers.entries()) {
    const event = app.events.groupMessage({ platform: 'qq-bot', userId: fixture.bid, text });
    const result = await app.runHandler(handler, event);
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const [message] = result.messages;
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.match(view.text, new RegExp(`第${index + 1}/${layers.length}页`));
    assert.deepEqual(view.commands.filter(command => command.startsWith('/帮助 炼气') && command.endsWith('层')),
      expectedLayers.map(layer => '/帮助 ' + layer));
    assert.equal(view.text.split('\n').filter(line => line.includes('玩法：')).length, expectedLayers.length);
    if (expectedLayers.includes('炼气九层')) {
      assert.match(view.text, /宗门挖矿和宗门主线须先入宗/);
      assert.match(view.text, /开塘需 10,000 灵石/);
    }
    assert.ok([...view.text].length <= 260, `第 ${index + 1} 页长度 ${[...view.text].length}`);
    if (index + 1 < layers.length) {
      const next = view.commands.find(command => command === '/天书 炼气 ' + (index + 2));
      assert.ok(next);
      text = next;
    }
  }
});
