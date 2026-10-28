import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage, type TestRunResult } from 'alemonjs/testing';
import handler from '../../src/response/treasures/res';
import { businessEnvelope, gameFixture } from './fixture';

after(shutdownLogger);
const confirmationRef = 'r1_1_b_mh9of000_0123456789abcdef01234567';
const operationId = 'batch-original-operation';
type Kind = 'batch-promote' | 'batch-upgrade';
const commandFor = (kind: Kind) => kind === 'batch-promote' ? '/宝物 一键突破' : '/宝物 一键升级';
function receipt(kind: Kind) {
  const upgrading = kind === 'batch-upgrade';
  const items = [
    { treasureId: 504, name: '神农鼎', rarity: 5, fromLevel: 1, toLevel: upgrading ? 3 : 1, fromGrade: 1, toGrade: upgrading ? 1 : 2,
      experienceCost: upgrading ? 300 : 0, duplicatesCost: upgrading ? 0 : 1, xianYunCost: 0, fromGradeName: '星尘1阶', toGradeName: upgrading ? '星尘1阶' : '星尘2阶' },
    { treasureId: 603, name: '乾坤鼎', rarity: 6, fromLevel: 2, toLevel: upgrading ? 4 : 2, fromGrade: 15, toGrade: upgrading ? 15 : 16,
      experienceCost: upgrading ? 700 : 0, duplicatesCost: upgrading ? 0 : 3, xianYunCost: upgrading ? 0 : 200 }
  ];
  return { kind, operationId, result: { operationId, message: upgrading ? '一键升级完成' : '一键突破完成', items,
    experienceCost: upgrading ? 1000 : 0, duplicatesCost: upgrading ? 0 : 4, xianYunCost: upgrading ? 0 : 200 } };
}
function preview(kind: Kind) {
  return { kind, operationId, confirmationRef, expiresAt: '2026-10-28T10:00:00+08:00',
    summary: [`${kind === 'batch-promote' ? '一键突破' : '一键升级'}：按本次预览培养2件宝物。`, '确认凭据24小时有效；状态变化时请重新预览。网络结果不明时请重试原确认。'] };
}
function delivered(result: TestRunResult) {
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const walk = (nodes: unknown[]) => {
    for (const raw of nodes) {
      if (!raw || typeof raw !== 'object') continue;
      const node = raw as Record<string, unknown>;
      if (node.type === 'MD.button') assert.equal((node.options as Record<string, unknown>)?.autoEnter, false);
      if (Array.isArray(node.value)) walk(node.value);
    }
  };
  walk(message.nodes);
  assert.ok(!JSON.stringify(message.nodes).includes('show='));
  const view = inspectMessage(message.nodes);
  assert.ok(view.commands.every(command => [...command].length <= 80));
  return view;
}

for (const kind of ['batch-promote', 'batch-upgrade'] as const) {
  test(`${kind}真实预览和重复确认沿原ref，展示总计逐项且无探索叙事延迟`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid,
      request.path.endsWith('treasures.preview') ? preview(kind) : receipt(kind)));
    const first = delivered(await app.runHandler(handler, app.events.privateMessage({ text: commandFor(kind), platform: 'qq-bot' })));
    assert.match(first.text, /^宝物操作确认\n/);
    assert.match(first.text, /24小时有效/);
    assert.match(first.text, /有效至/);
    const confirm = first.commands.find(command => command.startsWith('/确认宝物 '));
    assert.equal(confirm, `/确认宝物 ${confirmationRef}`);
    assert.ok(first.commands.includes('/宝物'));
    assert.deepEqual(requests[0].body.arguments, { kind });
    for (let repeat = 0; repeat < 2; repeat++) {
      const view = delivered(await app.runHandler(handler, app.events.privateMessage({ text: confirm!, platform: 'qq-bot' })));
      assert.match(view.text, /^宝物操作回执\n/);
      assert.ok(view.text.includes(`操作编号 ${operationId}`));
      const totals = receipt(kind).result;
      assert.ok(view.text.includes(`总消耗：宝物经验 ${totals.experienceCost} · 重复本体 ${totals.duplicatesCost} · 仙蕴 ${totals.xianYunCost}`));
      assert.match(view.text, /神农鼎/);
      assert.match(view.text, /乾坤鼎/);
      if (kind === 'batch-upgrade') {
        assert.match(view.text, /神农鼎 · Lv\.1 → Lv\.3/);
        assert.match(view.text, /乾坤鼎 · Lv\.2 → Lv\.4/);
        assert.match(view.text, /消耗：宝物经验 300 · 重复本体 0 · 仙蕴 0/);
        assert.match(view.text, /消耗：宝物经验 700 · 重复本体 0 · 仙蕴 0/);
      } else {
        assert.match(view.text, /神农鼎 · 星尘1阶 → 星尘2阶/);
        assert.match(view.text, /乾坤鼎 · 第15品 → 第16品/);
        assert.match(view.text, /消耗：宝物经验 0 · 重复本体 1 · 仙蕴 0/);
        assert.match(view.text, /消耗：宝物经验 0 · 重复本体 3 · 仙蕴 200/);
      }
      assert.ok(view.commands.includes('/宝物 详情 504'));
      assert.ok(view.commands.includes('/宝物 详情 603'));
      assert.doesNotMatch(view.text, /你踏|你越|你横|上古遗珍探索完成|⭐/);
      assert.equal(app.clock.pending, 0);
    }
    assert.equal(requests.length, 3);
    assert.ok(requests.slice(1).every(request => request.path.endsWith('treasures.confirm')));
    assert.deepEqual(requests.slice(1).map(request => request.body.arguments), [{ confirmationRef }, { confirmationRef }]);
    assert.ok(requests.slice(1).every(request => request.idempotencyKey));
  });

  for (const invalid of ['empty-items', 'negative-item-cost', 'fractional-level', 'missing-total', 'wrong-operation', 'invalid-rarity'] as const) {
    test(`${kind}异常回执${invalid}保留原ref恢复，不重新预览`, async t => {
      const malformed = structuredClone(receipt(kind));
      if (invalid === 'empty-items') malformed.result.items = [];
      if (invalid === 'negative-item-cost') malformed.result.items[0].experienceCost = -1;
      if (invalid === 'fractional-level') malformed.result.items[0].toLevel = 1.5;
      if (invalid === 'missing-total') Reflect.deleteProperty(malformed.result, 'xianYunCost');
      if (invalid === 'wrong-operation') malformed.result.operationId = 'other-operation';
      if (invalid === 'invalid-rarity') malformed.result.items[0].rarity = 7;
      let calls = 0;
      const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, ++calls === 1 ? malformed : receipt(kind)));
      const failed = delivered(await app.runHandler(handler, app.events.privateMessage({ text: `/确认宝物 ${confirmationRef}`, platform: 'qq-bot' })));
      assert.match(failed.text, /操作结果尚未获完整确认/);
      const retry = failed.commands.find(command => command.startsWith('/确认宝物 '));
      assert.equal(retry, `/确认宝物 ${confirmationRef}`);
      assert.doesNotMatch(failed.text, /总消耗|一键升级完成|一键突破完成/);
      const recovered = delivered(await app.runHandler(handler, app.events.privateMessage({ text: retry!, platform: 'qq-bot' })));
      assert.ok(recovered.text.includes(`操作编号 ${operationId}`));
      assert.match(recovered.text, /总消耗/);
      assert.equal(app.clock.pending, 0);
      assert.equal(requests.length, 2);
      assert.ok(requests.every(request => request.path.endsWith('treasures.confirm')));
      assert.deepEqual(requests.map(request => request.body.arguments), [{ confirmationRef }, { confirmationRef }]);
    });
  }
}
