import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { Expose, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import open from '../../src/response/lootbox/open/res';
import list from '../../src/response/storage/newBag/lootboxes/res';
import { parseLootboxOpen, openBackendLootbox } from '../../src/api/bot/lootbox-open';
import { parseBackendLootboxes } from '../../src/api/bot/queries';
import { createBackendRequestContext } from '../../src/api/bot/context';
import { commonActions } from '../../src/expose/common-actions';
import { bagQueryActions } from '../../src/expose/bags';
import type { LootboxTreasureSelection } from '../../src/api/schemas/lootbox-selection';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const names = {
  rare: ['采薇竹篮', '长明青灯', '丹砂玉匙', '春风拂尘', '寻幽罗盘', '轻身羽符'],
  epic: ['万木春符', '人皇笔', '地皇书', '神农鼎', '归元玉璧', '御风仙履'],
  mythic: ['九天息壤', '玉净瓶', '乾坤鼎', '掌天瓶', '万宝乾坤袋', '太初归元珠']
};
const labels = { rare: '稀有宝盒', epic: '史诗宝盒', mythic: '神话宝盒' };
const bases = { rare: 400, epic: 500, mythic: 600 };
const selection = (rarity: LootboxTreasureSelection['rarity']): LootboxTreasureSelection => ({
  kind: 'treasure', rarity, choices: names[rarity].map((name, index) => ({ treasureId: bases[rarity] + index + 1, name, rarity }))
});
const preview = (rarity: LootboxTreasureSelection['rarity']) => ({ lootboxId: bases[rarity] + 90, lootboxName: labels[rarity], openCount: 0, rewards: [], selection: selection(rarity) });
const bag = (rarity: LootboxTreasureSelection['rarity']) => ({ page: 1, pageSize: 5, total: 1, items: [{
  id: 99, lootboxId: bases[rarity] + 90, name: labels[rarity], quantity: 2, description: '自选同稀有度完整宝物一件',
  capabilities: [{ kind: 'open', valid: true, options: [{ requestedCount: 1, effectiveCount: 1 }] }], selection: selection(rarity)
}] });

function successful(result: Awaited<ReturnType<Awaited<ReturnType<typeof gameFixture>>['app']['runHandler']>>) {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  function visit(node: unknown) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== 'object') return;
    const value = node as { type?: string; options?: { autoEnter?: boolean; data?: string }; value?: unknown };
    if (value.type === 'MD.button') {
      assert.equal(value.options?.autoEnter, false);
      assert.ok([...(value.options?.data ?? '')].length <= 80);
      assert.ok(!value.options?.data?.includes('show'));
    }
    if (Array.isArray(value.value)) visit(value.value);
  }
  visit(message.nodes);
  return view;
}

for (const rarity of ['rare', 'epic', 'mythic'] as const) for (const isPrivate of [false, true]) {
  test(`${labels[rarity]} inventory button only enters one-box preview private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, bag(rarity)));
    const event = isPrivate ? app.events.privateMessage({ text: '/储物袋 礼盒', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/储物袋 礼盒', platform: 'qq-bot' });
    const view = successful(await app.runHandler(list, event));
    assert.match(view.text, /自选宝物/);
    assert.ok(view.commands.includes(`/开启礼盒 ${bases[rarity] + 90} 1`));
    assert.ok(!view.commands.some(command => /^\/开启礼盒 \d+ 1 \d+/.test(command)));
    assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/storage.lootboxes'));
  });
  test(`${labels[rarity]} preview exposes all six including owned choices without consuming private=${isPrivate}`, async t => {
    let consumed = 0;
    const { app, requests } = await gameFixture(t, request => {
      const args = request.body.arguments as { treasureId?: number };
      if (args.treasureId !== undefined) consumed++;
      return businessEnvelope(request.bid, preview(rarity));
    });
    const text = `/开启礼盒 ${labels[rarity]} 1`;
    const event = isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const view = successful(await app.runHandler(open, event));
    assert.equal(consumed, 0); assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { lootboxName: labels[rarity], openCount: 1 });
    assert.match(view.text, /当前仅预览，尚未消耗宝盒/);
    assert.match(view.text, /已拥有的宝物也可选择/); assert.match(view.text, /不计入探索次数与保底/);
    assert.ok(!view.text.includes('获得：'));
    for (const choice of selection(rarity).choices) {
      assert.ok(view.text.includes(choice.name));
      assert.ok(view.commands.includes(`/开启礼盒 ${bases[rarity] + 90} 1 ${choice.treasureId}`));
    }
    assert.ok(view.commands.includes('/储物袋 礼盒'));
  });
}

test('selected already-owned mythic is sent unchanged and replay keeps original idempotency key', async t => {
  const settled = { lootboxId: 690, lootboxName: '神话宝盒', openCount: 1, rewards: [{ category: 'treasure', rewardId: 601, name: '九天息壤', quantity: 1 }] };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, settled));
  const event = app.events.privateMessage({ text: '/开启礼盒 690 1 601', platform: 'qq-bot' });
  for (let i = 0; i < 2; i++) {
    const view = successful(await app.runHandler(open, event));
    assert.match(view.text, /开启【神话宝盒】/); assert.match(view.text, /九天息壤/);
    assert.ok(!view.text.includes('当前仅预览'));
    assert.ok(!view.commands.some(command => / 601$/.test(command)));
  }
  assert.equal(requests.length, 2);
  assert.deepEqual(requests.map(request => request.body.arguments), [{ lootboxName: '690', openCount: 1, treasureId: 601 }, { lootboxName: '690', openCount: 1, treasureId: 601 }]);
  assert.ok(requests[0].idempotencyKey); assert.equal(requests[0].idempotencyKey, requests[1].idempotencyKey);
});

test('maximum safe numeric IDs generate complete manual selection commands within the QQ budget', async t => {
  const max = Number.MAX_SAFE_INTEGER;
  const data = { ...preview('mythic'), lootboxId: max, selection: { kind: 'treasure', rarity: 'mythic', choices: [{ treasureId: max, name: '边界宝物', rarity: 'mythic' }] } };
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const view = successful(await app.runHandler(open, app.events.privateMessage({ text: '/开启礼盒 神话宝盒 1', platform: 'qq-bot' })));
  const command = `/开启礼盒 ${max} 1 ${max}`;
  assert.ok(view.commands.includes(command)); assert.equal([...command].length, 41); assert.ok(Buffer.byteLength(command, 'utf8') <= 80);
});

for (const suffix of ['1 abc', '1 0', '1 -1', '1 1.5', '1 Infinity', '1 9007199254740992', '2 601', '1 601 extra']) {
  test(`invalid selection ${suffix} never sends a backend write`, async t => {
    const { app, requests } = await gameFixture(t, () => { throw new Error('Invalid input must not write'); });
    const view = successful(await app.runHandler(open, app.events.privateMessage({ text: `/开启礼盒 690 ${suffix}`, platform: 'qq-bot' })));
    assert.equal(requests.length, 0); assert.match(view.text, /自选宝盒每次只能开启1个/);
    assert.ok(view.commands.includes('/储物袋 礼盒'));
  });
}

test('old random boxes retain request and response shape when selection is absent', async t => {
  const data = { lootboxName: '材料礼盒', openCount: 3, rewards: [{ category: 'item', rewardId: 9, name: '药草', quantity: 6 }] };
  assert.deepEqual(parseLootboxOpen(data), data);
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const view = successful(await app.runHandler(open, app.events.groupMessage({ text: '/开启礼盒 材料礼盒 3', platform: 'qq-bot' })));
  assert.match(view.text, /开启【材料礼盒】×3/); assert.match(view.text, /药草 ×6/);
  assert.deepEqual(requests[0].body.arguments, { lootboxName: '材料礼盒', openCount: 3 });
});

test('malformed or nonzero selection receipts fail closed without fabricating rewards', async t => {
  const data = { ...preview('mythic'), openCount: 1 };
  assert.throws(() => parseLootboxOpen(data), /自选预览不完整/);
  assert.throws(() => parseLootboxOpen({ ...preview('mythic'), lootboxId: undefined }), /自选预览不完整/);
  assert.throws(() => parseLootboxOpen({ ...preview('mythic'), selection: { ...selection('mythic'), choices: [{ treasureId: 601, name: '九天息壤', rarity: 'epic' }] } }), /自选宝物不完整/);
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const view = successful(await app.runHandler(open, app.events.privateMessage({ text: '/开启礼盒 690 1', platform: 'qq-bot' })));
  assert.match(view.text, /开启礼盒失败/); assert.ok(!view.text.includes('获得：'));
});

test('unavailable choice capability stays disabled and accidental multi-open option is not exposed', async t => {
  const data = bag('mythic'); data.items[0].capabilities[0].options = [{ requestedCount: 10, effectiveCount: 2 }];
  assert.equal(parseBackendLootboxes(data).items[0].selection?.choices.length, 6);
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const view = successful(await app.runHandler(list, app.events.privateMessage({ text: '/储物袋 礼盒', platform: 'qq-bot' })));
  assert.ok(!view.commands.some(command => command.startsWith('/开启礼盒')));
});

test('direct lootbox API forwards selected ID and original request context', async t => {
  const settled = { lootboxId: 690, lootboxName: '神话宝盒', openCount: 1, rewards: [{ category: 'treasure', rewardId: 601, name: '九天息壤', quantity: 1 }] };
  const { app, requests } = await gameFixture(t, () => settled);
  const result = await app.runHandler(async event => {
    const response = await openBackendLootbox(event.UserId, 1, '神话宝盒', 1, createBackendRequestContext(event), 601);
    assert.deepEqual(response, settled);
  }, app.events.privateMessage({ text: '/开启礼盒 神话宝盒 1 601', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(requests[0].body, { lootboxName: '神话宝盒', openCount: 1, treasureId: 601 }); assert.ok(requests[0].idempotencyKey);
});

test('Expose lists selection and supports preview/selected request without dropping candidates', async t => {
  const { app, requests } = await gameFixture(t, request => request.path === '/api/v1/robot/identity' ? { bid: request.bid, account: { status: 'registered', playerId: 1 } } : request.path.startsWith('/api/v1/players/1/lootboxes') ? bag('mythic') : businessEnvelope(request.bid, (request.body.arguments as { treasureId?: number }).treasureId ? { lootboxId: 690, lootboxName: '神话宝盒', openCount: 1, rewards: [{ category: 'treasure', rewardId: 601, name: '九天息壤', quantity: 1 }] } : preview('mythic')));
  const protocol = 'xiuxian.lootbox.selection.fixture.v1';
  await app.mount({ expose: Expose.create().provide({ name: protocol, description: 'Offline selection fixture', actions: { get_lootboxes: bagQueryActions.get_lootboxes, open_lootbox_by_id: commonActions.open_lootbox_by_id, open_lootbox: commonActions.open_lootbox } }) }, undefined, 'xiuxian-game');
  const event = app.events.privateMessage({ text: '/储物袋 礼盒', platform: 'qq-bot' });
  const call = (action: string, input: Record<string, unknown>) => app.invoke(event, () => Expose.create().call(protocol, 'xiuxian-game', action, input), 'ai-plugin');
  const bagResult = await call('get_lootboxes', {});
  assert.equal(bagResult.value.ok, true, JSON.stringify(bagResult.value));
  if (bagResult.value.ok) assert.equal((bagResult.value.data as { items: { selection: LootboxTreasureSelection }[] }).items[0].selection.choices.length, 6);
  const shown = await call('open_lootbox_by_id', { lootboxId: 690, openCount: 1, intentId: 'preview' });
  assert.equal(shown.value.ok, true, JSON.stringify(shown.value));
  if (shown.value.ok) assert.deepEqual((shown.value.data as { result: { selection: LootboxTreasureSelection; openCount: number } }).result.selection, selection('mythic'));
  const opened = await call('open_lootbox_by_id', { lootboxId: 690, openCount: 1, treasureId: 601, intentId: 'selected' });
  assert.equal(opened.value.ok, true, JSON.stringify(opened.value));
  assert.deepEqual(requests.at(-1)?.body.arguments, { lootboxId: 690, lootboxName: '', openCount: 1, treasureId: 601 });
  const named = await call('open_lootbox', { lootboxName: '神话宝盒', openCount: 1, treasureId: 601, intentId: 'named' });
  assert.equal(named.value.ok, true, JSON.stringify(named.value));
  assert.deepEqual(requests.at(-1)?.body.arguments, { lootboxName: '神话宝盒', openCount: 1, treasureId: 601 });
  const count = requests.length;
  const invalid = await call('open_lootbox_by_id', { lootboxId: 690, openCount: 2, treasureId: 601 });
  assert.equal(invalid.value.ok, false); assert.equal(requests.length, count);
});
