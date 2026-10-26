import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__teamApplicationPresentation = { sent: [], raw: null, calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  entryPoints: ['src/response/team/cancelApplication/res.ts'], bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'team-message-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode)=>{const state=globalThis.__teamApplicationPresentation;state.calls++;return {handled:false,data:decode(state.raw)};};` }));
  }}]
});
const { default: handler } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(raw) {
  state.raw = raw; state.sent = []; state.calls = 0;
  const event = { name: 'message.create', UserId: 'player', MessageText: '/取消队伍申请', isPrivate: true };
  await framework.run(handler, event, async () => { throw new Error('unexpected next'); });
  assert.equal(state.calls, 1);
  assert.equal(state.sent.length, 1);
  return flatten(state.sent[0]);
}
const text = nodes => nodes.map(node => String(node.value ?? '')).join('');

test('cancel application keeps original no-pending and failed bubbles with one backend repeat suffix', async () => {
  const suffix = '重复提醒';
  const empty = await render({ outcome: 'no_pending', message: `您当前没有待审核的队伍申请\n\n${suffix}` });
  assert.match(text(empty), /无待处理申请/);
  assert.equal(text(empty).split(suffix).length - 1, 1);
  const failed = await render({ outcome: 'not_pending', message: `申请记录不存在或已处理\n\n${suffix}` });
  assert.match(text(failed), /取消失败/);
  for (const reason of ['申请编号不存在', '申请已被处理', '申请不属于您']) assert.ok(text(failed).includes(reason));
  assert.equal(text(failed).split(suffix).length - 1, 1);
  assert.ok(failed.some(node => node.options?.data === '/我的队伍申请'));
});

test('cancel application keeps list instructions and cancellation confirmation', async () => {
  const list = text(await render({ outcome: 'list', applications: [{ id: 21, leaderName: '青云', createdAt: '2026-10-07T00:00:00Z' }] }));
  assert.match(list, /青云的队伍/);
  assert.match(list, /申请编号：21/);
  assert.match(list, /取消队伍申请 申请编号/);
  const success = text(await render({ outcome: 'cancelled', leaderName: '' }));
  assert.match(success, /已取消向【未知】队伍的申请/);
  assert.match(success, /您可以继续申请其他队伍/);
});
