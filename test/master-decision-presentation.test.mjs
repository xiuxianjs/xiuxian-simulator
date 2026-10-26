import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__masterDecisionPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as binding} from './src/response/master/accept/res.ts';export {default as graduate} from './src/response/master/graduateAccept/res.ts';export {default as reject} from './src/response/master/graduateReject/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'master-decision-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode)=>{const state=globalThis.__masterDecisionPresentation;state.calls++;return {handled:false,data:decode(state.raw)};};` }));
  }}]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const allNodes = nodes => nodes.flatMap(node => [node, ...(Array.isArray(node.value) ? allNodes(node.value) : [])]);
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(name, text, raw) {
  state.raw = raw; state.sent = []; state.calls = 0;
  const event = { name: 'message.create', UserId: 'player', MessageText: text, isPrivate: true };
  await framework.run(handlers[name], event, async () => { throw new Error('unexpected next'); });
  assert.equal(state.calls, 1); assert.equal(state.sent.length, 1);
  return flatten(state.sent[0]);
}
const textOf = nodes => nodes.map(node => String(node.value ?? '')).join('');
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);

test('approval lists keep child quote text and the original decision buttons together', async () => {
  const list = { outcome: 'list', received: [{ id: 31, fromUserId: 4, fromName: '青云', fromRealm: '炼气二层', createdAt: '2026-10-07T00:00:00Z' }] };
  const rows = [ ['binding', '/同意拜师', ['同意拜师']], ['graduate', '/同意出师', ['同意出师', '拒绝出师']], ['reject', '/拒绝出师', ['拒绝出师']] ];
  for (const [name, text, expected] of rows) {
    const nodes = await render(name, text, list);
    assert.match(textOf(nodes), /青云/); assert.match(textOf(nodes), /UID：4/); assert.match(textOf(nodes), /炼气二层/);
    for (const command of expected) {
      assert.ok(commands(nodes).includes(`/${command} 4`));
      assert.ok(allNodes(state.sent[0]).filter(node => node.type === 'MD.blockquote').some(node => textOf(flatten(node.value)).includes('UID：4') && commands(flatten(node.value)).includes(`/${command} 4`)));
    }
    if (name === 'reject') assert.ok(!commands(nodes).includes('/同意出师 4'));
  }
});

test('approval lists and decision confirmations keep original empty and success messages', async () => {
  for (const [name, command, label] of [['binding', '同意拜师', '拜师'], ['graduate', '同意出师', '出师'], ['reject', '拒绝出师', '出师']]) {
    assert.ok(textOf(await render(name, `/${command}`, { outcome: 'list', received: [] })).includes(`暂无待处理的${label}申请`));
    const message = name === 'binding' ? '已收徒青云' : name === 'graduate' ? '已确认出师' : '已拒绝出师申请';
    assert.ok(textOf(await render(name, `/${command} 4`, { outcome: 'decided', message })).includes(message));
  }
});
