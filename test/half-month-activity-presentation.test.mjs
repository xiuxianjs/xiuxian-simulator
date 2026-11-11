import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';

const state = globalThis.__halfMonthPresentation = { sent: [], calls: [] };
const harness = createPresentationHarness(state);
const fixture = await build({
  entryPoints: ['src/response/halfMonthActivity/res.ts'],
  bundle: true, write: false, platform: 'node', format: 'esm',
  banner: { js: `import { createRequire as testRequire } from 'node:module'; const require = testRequire(${JSON.stringify(import.meta.url)});` },
  plugins: [{ name: 'half-month-transport-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(api\/bot\/client|response\/config)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
      export const selects = ['message.create','private.message.create','interaction.create','private.interaction.create'];
      export function writeContext() { return { requestId: 'trace', idempotencyKey: 'test-operation' }; }
      export async function requestBackend(_bid, op, args) {
        const fixture = globalThis.__halfMonthPresentation;
        fixture.calls.push({ op, args });
        return fixture.replies[op];
      }
    ` }));
  } }]
});
const handler = (await import('data:text/javascript;base64,' + Buffer.from(fixture.outputFiles[0].text).toString('base64'))).default;
const reference = 'r1_3w5e11264sgsf_hm_1y2p0ij32e8e7_0123456789abcdef01234567';
const get = 'get_players_id_half_month_activity';
const preview = 'post_players_id_half_month_activity_preview';
const confirm = 'post_players_id_half_month_activity_confirm';
const product = { id: 'jade-item-76', currency: 'JADE', price: 35, limit: 2, reward: { name: '换词符', quantity: 1 } };
const overview = {
  month: '2026-11', day: 7, startsAt: '2026-11-15T00:00:00+08:00', endsAt: '2026-11-22T00:00:00+08:00',
  jade: 98, makeupPrice: 1, unopened: [], products: [product],
  task: { name: '打理灵田', action: 'farm_work', tiers: [{ count: 1, jade: 4 }, { count: 2, jade: 5 }, { count: 3, jade: 6 }] },
  progress: { signs: [null, {}, {}, {}, {}, {}, {}], taskCounts: [0, 0, 0, 0, 0, 0, 2], taskJade: [0, 0, 0, 0, 0, 0, 9], bought: {} }
};

async function render(command, replies) {
  Object.assign(state, { sent: [], calls: [], replies });
  const result = await harness.run(handler, { name: 'message.create', UserId: 'fixture', uid: 7, isPrivate: true, MessageText: command });
  assert.equal(result.messages.length, 1);
  assert.ok(result.messages[0].nodes.length);
  const nodes = result.messages[0].nodes;
  const commands = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'MD.button') commands.push(node.options.data);
    Object.values(node).forEach(visit);
  }
  visit(nodes);
  return { text: JSON.stringify(nodes), commands };
}

test('activity overview shows tier progress and navigates to farm and shop', async () => {
  const result = await render('/半月活动', { [get]: overview });
  assert.match(result.text, /打理灵田/);
  assert.match(result.text, /已获 9 仙玉/);
  assert.ok(result.commands.includes('/我的灵田'));
  assert.ok(result.commands.includes('/半月活动 商店'));
});

test('shop confirmation round-trips a complete server reference within QQ budget', async () => {
  const quote = { ref: reference, currency: 'JADE', price: 35, reward: product.reward, expiresAt: overview.endsAt };
  const view = await render('/半月活动 兑换 1', { [get]: overview, [preview]: quote });
  const command = view.commands.find(value => value.startsWith('/半月活动 确认 '));
  assert.equal(command, `/半月活动 确认 ${reference}`);
  assert.ok([...command].length <= 80);
  assert.match(view.text, /仙玉 ×35/);
  assert.ok(view.commands.includes('/半月活动 商店'));
  assert.deepEqual(state.calls[1].args.body, { month: '2026-11', productId: product.id });
  const receipt = await render(command, { [confirm]: { purchase: { issued: [{ name: '换词符', amount: 1 }] } } });
  assert.match(receipt.text, /兑换成功/);
  assert.deepEqual(state.calls[0].args.body, { ref: reference });

  const truncated = await render(command.slice(0, -1), {});
  assert.match(truncated.text, /确认编号无效/);
  assert.equal(state.calls.length, 0);
  const invalid = await render('/半月活动 确认 SAFE_PLACEHOLDER', {});
  assert.doesNotMatch(invalid.text, /SAFE_PLACEHOLDER/);
  assert.equal(state.calls.length, 0);
});

test('makeup confirmation displays the cost and reuses the server reference', async () => {
  const quote = { ref: reference, day: 1, currency: 'SPIRIT_MILK', price: 1, checkin: { crystals: 250, jade: 10 }, expiresAt: overview.endsAt };
  const view = await render('/半月活动 补签 1', { [get]: overview, [preview]: quote });
  const command = view.commands.find(value => value.startsWith('/半月活动 确认 '));
  assert.equal(command, `/半月活动 确认 ${reference}`);
  assert.ok([...command].length <= 80);
  assert.match(view.text, /道晶 ×1/);
  assert.match(view.text, /灵晶 ×250/);
  assert.ok(view.commands.includes('/半月活动'));
  assert.deepEqual(state.calls[1].args.body, { month: '2026-11', day: 1 });
  const receipt = await render(command, { [confirm]: { day: 1, sign: { signs: [quote.checkin] } } });
  assert.match(receipt.text, /第 1 天已补签/);
  assert.deepEqual(state.calls[0].args.body, { ref: reference });
});
