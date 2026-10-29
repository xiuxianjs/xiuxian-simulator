import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import handler from '../../src/response/treasures/res';
import { businessEnvelope, gameFixture } from './fixture';

after(async () => { await shutdownLogger(); });

// The optional file contains stdout from the same Go fixture test, never a
// manually reconstructed balance fixture. Offline-only suites skip Go tests.
const output = process.env.TREASURE_GROWTH_CLIENT_FIXTURE_FILE
  ? readFileSync(process.env.TREASURE_GROWTH_CLIENT_FIXTURE_FILE, 'utf8')
  : goTestFixture(['test', './internal/service', '-run', '^TestTreasureGrowthClientFixture$', '-v', '-count=1'], {
      cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
    }).toString();
const fixtures = Object.fromEntries([...output.matchAll(/TREASURE_GROWTH_CLIENT=([^|]+)\|(.+)/g)].map(row => [row[1], JSON.parse(row[2])]));
for (const key of ['overview-50', 'overview-51', 'overview-110', 'preview-upgrade', 'preview-batch', 'confirm-single']) assert.ok(fixtures[key], `Missing real Go fixture ${key}`);

function delivered(result: TestRunResult) {
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const walk = (nodes: unknown[]) => {
    for (const node of nodes) {
      const row = node as { type?: string; value?: unknown; options?: { autoEnter?: boolean } };
      if (row.type === 'MD.button') assert.equal(row.options?.autoEnter, false);
      if (Array.isArray(row.value)) walk(row.value);
    }
  };
  walk(message.nodes);
  assert.doesNotMatch(JSON.stringify(message.nodes), /"show"\s*:/);
  const view = inspectMessage(message.nodes);
  assert.ok(view.commands.every(command => [...command].length <= 80));
  return view;
}

test('QQ真实Go新成长50级详情使用下一等级属性与服务端指数经验报价', async t => {
  const data = fixtures['overview-50'];
  const item = data.items.find((entry: { definition: { id: number } }) => entry.definition.id === 504);
  assert.equal(item.level, 50);
  assert.equal(item.attributes.hp, 4308);
  assert.equal(item.upgradePreview.attributes.hp, 4692);
  assert.equal(item.nextLevelCost, 598);
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/宝物 详情 504', platform: 'qq-bot' })));
  assert.match(view.text, /等级 50\/110/);
  assert.match(view.text, /生命 \+4,308 → 生命 \+4,692/);
  assert.match(view.text, /升级至 Lv\.51/);
  assert.ok(view.text.includes(`需要经验 ${item.nextLevelCost}`));
  assert.doesNotMatch(view.text, /生命 \+1,188|生命 \+1,200/);
  assert.ok(view.commands.includes('/宝物 升级 504'));
  assert.equal(requests.length, 1);
});

test('QQ真实Go110级详情按新成长显示246228生命，满级不提供升级入口', async t => {
  const data = fixtures['overview-110'];
  const item = data.items.find((entry: { definition: { id: number } }) => entry.definition.id === 504);
  assert.equal(item.level, 110);
  assert.equal(item.attributes.hp, 246228);
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/宝物 详情 504', platform: 'qq-bot' })));
  assert.match(view.text, /等级 110\/110/);
  assert.match(view.text, /生命 \+246,228/);
  assert.match(view.text, /等级已达当前境界上限/);
  assert.ok(!view.commands.includes('/宝物 升级 504'));
  assert.doesNotMatch(view.text, /升级至 Lv\.111|需要经验/);
  assert.equal(requests.length, 1);
});

test('QQ真实Go51级详情显示指数曲线下一次640经验，不沿用旧报价', async t => {
  const data = fixtures['overview-51'];
  const item = data.items.find((entry: { definition: { id: number } }) => entry.definition.id === 504);
  assert.equal(item.level, 51);
  assert.equal(item.nextLevelCost, 640);
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/宝物 详情 504', platform: 'qq-bot' })));
  assert.match(view.text, /等级 51\/110/);
  assert.match(view.text, /升级至 Lv\.52/);
  assert.ok(view.text.includes(`需要经验 ${item.nextLevelCost}`));
  assert.doesNotMatch(view.text, /需要经验 (?:120|121)(?:\s|$)/);
  assert.equal(requests.length, 1);
});

for (const [key, command, kind] of [
  ['preview-upgrade', '/宝物 升级 504', 'upgrade'],
  ['preview-batch', '/宝物 一键升级', 'batch-upgrade']
] as const) test(`QQ原样展示真实Go新成长报价 ${kind}，确认仍只绑定原引用`, async t => {
  const preview = fixtures[key];
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, preview));
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' })));
  for (const line of preview.summary) assert.ok(view.text.includes(line), line);
  assert.ok(view.commands.includes(`/确认宝物 ${preview.confirmationRef}`));
  assert.deepEqual(requests[0].body.arguments, kind === 'upgrade' ? { kind, treasureId: 504 } : { kind });
  assert.equal(requests.length, 1);
});

test('QQ新成长单件确认和重复恢复不重算新报价、不另建操作号', async t => {
  const preview = fixtures['preview-upgrade'];
  const receipt = fixtures['confirm-single'];
  assert.equal(receipt.operationId, preview.operationId);
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid,
    request.path.endsWith('/treasures.preview') ? preview : receipt));
  const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: '/宝物 升级 504', platform: 'qq-bot' })));
  const command = view.commands.find(value => value.startsWith('/确认宝物 '));
  assert.equal(command, `/确认宝物 ${preview.confirmationRef}`);
  const event = app.events.privateMessage({ text: command!, platform: 'qq-bot' });
  for (let replay = 0; replay < 2; replay++) {
    const confirmed = delivered(await app.runHandler(handler, event));
    assert.ok(confirmed.text.includes(receipt.result.message));
    assert.ok(confirmed.text.includes(`操作编号 ${preview.operationId}`));
    assert.doesNotMatch(confirmed.text, /尚未获完整确认|暂未取得完整预览/);
  }
  assert.equal(requests.length, 3);
  assert.ok(requests.slice(1).every(request => request.path.endsWith('/treasures.confirm')));
  assert.deepEqual(requests.slice(1).map(request => request.body.arguments), [{ confirmationRef: preview.confirmationRef }, { confirmationRef: preview.confirmationRef }]);
  assert.equal(requests[1].idempotencyKey, requests[2].idempotencyKey);
});
