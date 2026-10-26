import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { shutdownLogger } from 'alemonjs';
after(async () => { await shutdownLogger(); });

const state = globalThis.__pkReports = { sent: [], calls: 0, raw: null };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as enemies} from './src/response/enemy/res.ts';export {default as records} from './src/response/robberyRecord/res.ts';export {parseBackendEnemies} from './src/api/bot/queries.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'pk-report-test', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `
      export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected API');};
      export { useMessage } from 'alemonjs';
      export const runRobotBusiness=async(e,op,args,decode)=>{const s=globalThis.__pkReports;s.calls++;return {handled:false,data:decode(s.raw)};};
    ` }));
  } }]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(name, raw) {
  state.raw = raw; state.sent = []; state.calls = 0;
  const event = { name: 'message.create', UserId: 'player', MessageText: name === 'enemies' ? '/仇人' : '/打劫记录', isPrivate: true, uid: 1 };
  await framework.run(handlers[name], event, () => { throw new Error('unexpected next'); });
  assert.equal(state.calls, 1); assert.equal(state.sent.length, 1);
  return flatten(state.sent[0]);
}
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);
const text = nodes => nodes.map(node => typeof node.value === 'string' ? node.value : '').join('');
const report = (id, canCounterAttack) => ({
  id, attackerUid: 2, attackerName: '对手', isWin: false, stoneReward: 0, crystalReward: 0,
  droppedItemName: null, droppedItemQty: 0, targetShaQi: 0, isCounterAttack: false, isBounty: false,
  createdAt: '2026-10-18T10:00:00+08:00', attackerDisplayName: '对手', typeText: '⚔️打劫', resultText: '❌失败',
  lossText: '', dropText: '', canCounterAttack, counterDeadline: '2026-10-19T10:00:00+08:00',
  counterStatusText: canCounterAttack ? '可免费反击一次' : '反击进行中，等待本场结果'
});

test('one enemy keeps two independent counters and never falls back to a stale latest report', async () => {
  const raw = [{ uid: 2, name: '对手', totalAttacks: 3, lastAttackTime: '2026-10-18T10:00:00+08:00', lastLogId: 13, reports: [report(13, false), report(12, true), report(11, true)] }];
  const nodes = await render('enemies', raw);
  const actions = commands(nodes);
  assert.ok(actions.includes('/回击 11')); assert.ok(actions.includes('/回击 12'));
  assert.ok(!actions.includes('/回击 13')); assert.ok(actions.includes('/打劫 2'));
  assert.ok(text(nodes).includes('#13 反击进行中，等待本场结果'));
  assert.throws(() => handlers.parseBackendEnemies([{ ...raw[0], reports: [{ ...report(11, true), canCounterAttack: 'true' }] }]));
});

test('records show authoritative counter status/deadline and only eligible report actions', async () => {
  const nodes = await render('records', { records: [report(11, true), report(12, false)], currentPage: 1, totalPages: 1, total: 2 });
  assert.ok(text(nodes).includes('反击截止：')); assert.ok(text(nodes).includes('反击进行中，等待本场结果'));
  assert.ok(commands(nodes).includes('/回击 11')); assert.ok(!commands(nodes).includes('/回击 12'));
});

test('legacy enemies retain their original single counter without fabricating PK reports', async () => {
  const nodes = await render('enemies', [{ uid: 2, name: '对手', totalAttacks: 1, lastAttackTime: '2026-10-18T10:00:00+08:00', lastLogId: 11 }]);
  assert.ok(commands(nodes).includes('/回击 11')); assert.ok(!text(nodes).includes('免费反击'));
});
