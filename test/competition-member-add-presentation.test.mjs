import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__competitionMemberAddPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as add} from './src/response/guildCompetition/addMember/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export class BackendAPIError extends Error{};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__competitionMemberAddPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
  }}]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(name, text, raw, failure=false) {
  state.failure=failure;
  state.raw = raw; state.sent = []; state.calls = 0;
  const event = { name: 'message.create', UserId: 'player', MessageText: text, isPrivate: true, uid:1 };
  await framework.run(handlers[name], event, async () => { throw new Error('unexpected next'); });
  assert.equal(state.calls, 1); assert.equal(state.sent.length, raw.outcome === 'no_target' ? 0 : 1);
  if (!state.sent.length) return [];
  return flatten(state.sent[0]);
}
const textOf = nodes => nodes.map(node => String(node.value ?? '')).join('');
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessCompetitionMemberAddTargetsCandidatesTransactionsAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_COMPETITION_MEMBER_ADD_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => JSON.parse(m[2]).data);

test('add member list retains contribution order, power and selection/panel buttons', async () => {
  for (const row of receipts.filter(r => r.success && r.data.outcome === 'list')) {
    const nodes = await render('add', '/添加宗门大比成员', row.data), text = textOf(nodes), buttons = commands(nodes);
    let index = -1;
    for (const m of row.data.data.members) {const next = text.indexOf(`【${m.userId}】${m.name}`);assert.ok(next > index);index=next;assert.ok(text.includes(`战力✊${m.power}`));assert.ok(buttons.includes(`/添加宗门大比成员 ${m.userId}`));assert.ok(buttons.includes(`/查看信息 ${m.userId}`));}
    assert.ok(buttons.includes('/宗门大比'));
  }
});
test('position selection keeps exact free positions and resolved UID', async () => {
  for (const row of receipts.filter(r => r.success && r.data.outcome === 'positions')) {
    const nodes = await render('add', '/添加宗门大比成员 2', row.data), buttons = commands(nodes);
    assert.ok(textOf(nodes).includes('请选择要添加到的位置：'));
    assert.deepEqual(buttons.filter(c => c.startsWith('/添加宗门大比成员 ')), row.data.availablePositions.map(p => `/添加宗门大比成员 ${row.data.targetUid} ${p}`));
  }
});
test('direct add keeps original receipt and navigation without new repeat text', async () => {
  for (const row of receipts.filter(r => r.success && r.data.outcome === 'result')) {
    const nodes = await render('add', '/添加宗门大比成员 2 3', row.data), text = textOf(nodes);
    assert.ok(text.includes(row.data.receipt.message));assert.ok(commands(nodes).includes('/宗门大比'));assert.ok(!row.data.receipt.message.includes('\n\n'));
  }
});
test('unresolved targets remain silent and usage retains the original help', async () => {
  for (const row of receipts.filter(r => r.success && ['no_target','usage'].includes(r.data.outcome))) {
    const nodes = await render('add', '/添加宗门大比成员 2 3 多余', row.data);
    if (row.data.outcome === 'no_target') assert.deepEqual(nodes, []);
    else assert.ok(textOf(nodes).includes('指令格式：/添加宗门大比成员 [弟子UID/@目标] [位置(1-6)]'));
  }
});
test('list, positions and direct failures keep exact messages and stop after one API attempt', async () => {
  for (const command of ['/添加宗门大比成员', '/添加宗门大比成员 2', '/添加宗门大比成员 2 3']) {
    for (const row of receipts.filter(r => !r.success)) {
      const reply = row.middleware.replies.at(-1), nodes = await render('add', command, reply, true);
      assert.ok(textOf(nodes).includes(reply.text));assert.ok(commands(nodes).includes('/宗门大比'));
    }
  }
  state.transportError=true;
  try {for (const command of ['/添加宗门大比成员', '/添加宗门大比成员 2', '/添加宗门大比成员 2 3']) assert.ok(textOf(await render('add', command, {})).includes('网络超时'));}
  finally {state.transportError=false;}
});
