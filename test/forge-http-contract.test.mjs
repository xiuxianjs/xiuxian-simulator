import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// Exported from real HTTP requests through the Go router and robot middleware.
// Every player, resource and signing key belongs to an isolated synthetic test.
const samples = JSON.parse(readFileSync(new URL('./fixtures/forge-robot-contracts.json', import.meta.url), 'utf8'));
const bundle = await build({
  stdin: { resolveDir: process.cwd(), contents: `
    export {parseRobotBusinessEnvelope} from './src/api/bot/robot-business.ts';
    export * from './src/api/schemas/forge.ts';
  ` },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'forge-http-decode', setup(b) {
    b.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    b.onResolve({ filter: /^\.\/client$/ }, a => a.importer.includes('/src/api/bot/') ? { path: 'client', namespace: 'transport' } : undefined);
    b.onLoad({ filter: /.*/, namespace: 'transport' }, () => ({ contents: `
      export class BackendAPIError extends Error { constructor(message,code){super(message);this.code=code} }
      export const requestBackend=()=>{throw new Error('decoder attempted extra HTTP')};
      export const writeContext=()=>{throw new Error('decoder attempted write context')};
      export const writeTraceContext=writeContext;
    ` }));
  } }]
});
const parsers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const successCases = {
  'before-join': ['player', 'parseForgeOverview'],
  'tutorial-preview': ['player', 'parseForgePreview'],
  'tutorial-confirm': ['player', 'parseForgeResult'],
  'tutorial-new-message': ['player', 'parseForgeResult'],
  'learn-recipes': ['player', 'parseForgeOverview'],
  'ordinary-preview': ['player', 'parseForgePreview'],
  'ordinary-confirm': ['player', 'parseForgeResult'],
  'order-preview': ['forge-owner', 'parseForgeOrderPreview'],
  'order-create': ['forge-owner', 'parseForgeOrder'],
  'orders-crafter': ['player', 'parseForgeOrders'],
  'order-accept': ['player', 'parseForgeOrder'],
  'cancel-delivered': ['forge-owner', 'parseForgeOrder'],
  'history-crafter': ['player', 'parseForgeHistory'],
  'advance-stage': ['player', 'parseForgeOverview'],
  'refund-pending-owner': ['forge-owner', 'parseForgeOrders'],
  'refund-pending-crafter': ['player', 'parseForgeOrders'],
  'refund-complete': ['forge-owner', 'parseForgeOrder']
};

test('real Go robot HTTP envelopes pass the actual bot envelope and forge decoders', () => {
  for (const [key, [bid, decoder]] of Object.entries(successCases)) {
    const result = parsers.parseRobotBusinessEnvelope(samples[key], bid, parsers[decoder]);
    assert.equal(result.success, true, key);
    assert.equal(result.branch, 'business', key);
  }
  const result = parsers.parseRobotBusinessEnvelope(samples['order-accept'], 'player', parsers.parseForgeOrder);
  assert.equal(result.data.ownerId, 2);
  assert.equal(result.data.crafterId, 1);
  assert.equal(result.data.result.equipment.userId, 2);
  assert.equal(result.data.result.expGained, 0, 'stage experience cap survives the HTTP path');
  const preview = parsers.parseForgePreview(samples['ordinary-preview'].data);
  const crit = preview.recipe.attributes.find(a => a.key === 'critRate');
  assert.deepEqual([crit.min, crit.max, crit.unit], [4.75, 5, '%']);
});

test('server distinguishes held expired escrow from a committed refund', () => {
  for (const key of ['refund-pending-owner', 'refund-pending-crafter']) {
    const order = parsers.parseForgeOrders(samples[key].data).items[0];
    assert.equal(order.status, 'pending');
    assert.equal(order.refundPending, true);
    assert.equal(order.canAccept, false);
    assert.equal(order.canCancel, key === 'refund-pending-owner');
  }
  const complete = parsers.parseForgeOrder(samples['refund-complete'].data);
  assert.equal(complete.status, 'expired');
  assert.equal(complete.refundPending, false);
  for (const invalid of ['true', null, 1]) assert.throws(() => parsers.parseForgeOrder({...complete, refundPending: invalid}));
  assert.throws(() => parsers.parseForgeOrder({...complete, refundPending: true}));
  const pending = samples['refund-pending-crafter'].data.items[0];
  assert.throws(() => parsers.parseForgeOrder({...pending, canAccept: true}));
  const oldServer = {...pending}; delete oldServer.refundPending;
  assert.doesNotThrow(() => parsers.parseForgeOrder(oldServer));
});

test('tutorial tool reward survives actual HTTP receipts and rejects forged binding or context', () => {
  const preview = parsers.parseForgePreview(samples['tutorial-preview'].data);
  const result = parsers.parseForgeResult(samples['tutorial-confirm'].data);
  const replay = parsers.parseForgeResult(samples['tutorial-new-message'].data);
  assert.equal(preview.tutorialTool.templateId, 9001);
  assert.equal(result.tutorialTool.templateId, 9001);
  assert.equal(result.tutorialTool.equipped, true);
  assert.equal(result.tutorialTool.permission, 4);
  assert.equal(replay.tutorialTool.instanceId, result.tutorialTool.instanceId);
  for (const bad of [null, {...result.tutorialTool, permission: 6}, {...result.tutorialTool, instanceId: 0}, {...result.tutorialTool, equipped: 'true'}]) {
    assert.throws(() => parsers.parseForgeResult({...result, tutorialTool: bad}));
  }
  assert.throws(() => parsers.parseForgeResult({...result, tutorial: false}));
  assert.throws(() => parsers.parseForgePreview({...preview, tutorial: false}));
  const old = {...result}; delete old.tutorialTool;
  assert.doesNotThrow(() => parsers.parseForgeResult(old));
});

test('real expected refusals remain visible and middleware interception never reaches forge decoder', () => {
  const neverDecode = () => { throw new Error('refusal reached business decoder'); };
  for (const [key, bid, phrase] of [
    ['notjoined-refusal', 'player', '入门'],
    ['wrong-crafter', 'forge-owner', '仅指定匠师'],
    ['outsider-cancel', 'forge-outsider', '无权操作']
  ]) {
    const result = parsers.parseRobotBusinessEnvelope(samples[key], bid, neverDecode);
    assert.equal(result.success, false, key);
    assert.equal(result.branch, 'business', key);
    assert.ok(result.middleware.replies.at(-1).text.includes(phrase), key);
  }
  for (const [key, bid, reason] of [
    ['muted-forge', 'player', 'MUTED'], ['unregistered-forge', 'unknown-forge', 'UNREGISTERED']
  ]) {
    const result = parsers.parseRobotBusinessEnvelope(samples[key], bid, neverDecode);
    assert.equal(result.success, true);
    assert.equal(result.branch, 'middleware');
    assert.equal(result.middleware.reason, reason);
    assert.equal(result.data, undefined);
  }
});

test('combined forge response rejects mismatched actor and forged success on a refusal', () => {
  assert.throws(() => parsers.parseRobotBusinessEnvelope(samples['order-create'], 'player', parsers.parseForgeOrder));
  const malformed = structuredClone(samples['notjoined-refusal']);
  malformed.success = true;
  assert.throws(() => parsers.parseRobotBusinessEnvelope(malformed, 'player', parsers.parseForgePreview));
});
