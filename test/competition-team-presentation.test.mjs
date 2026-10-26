import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__competitionTeamPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as apply} from './src/response/guildCompetition/apply/res.ts';export {default as remove} from './src/response/guildCompetition/removeMember/res.ts';export {default as adjust} from './src/response/guildCompetition/adjustPosition/res.ts';export {default as clear} from './src/response/guildCompetition/clearTeam/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__competitionTeamPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
  }}]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(name, text, raw, failure=false) {
  state.failure=failure;
  state.raw = raw; state.sent = []; state.calls = 0;
  const event = { name: 'message.create', UserId: 'player', MessageText: text, isPrivate: true, uid:1 };
  await framework.run(handlers[name], event, async () => { throw new Error('unexpected next'); });
  assert.equal(state.calls, 1); assert.equal(state.sent.length, raw.outcome === 'no_match' ? 0 : 1);
  if (!state.sent.length) return [];
  return flatten(state.sent[0]);
}
const textOf = nodes => nodes.map(node => String(node.value ?? '')).join('');
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessCompetitionTeamActionsPhasesPermissionsRollbackAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_COMPETITION_TEAM_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));

const names = { 'competition.apply': 'apply', 'competition.member-remove': 'remove', 'competition.position-adjust': 'adjust', 'competition.team-clear': 'clear' };
test('remove and adjust keep their original usage bubbles after one admitted request', async () => {
  for (const {op, result: row} of receipts.filter(r => r.result.success && r.result.data.outcome === 'usage')) {
    const name = names[op], nodes = await render(name, '', row.data), text = textOf(nodes);
    assert.ok(text.includes(name === 'remove' ? '指令格式：/移除宗门大比成员 [位置(1-6)]' : '指令格式：/调整宗门大比位置 [原位置(1-6)] [新位置(1-6)]'));
    assert.equal(commands(nodes).includes('/宗门大比'), name === 'adjust');
  }
});
test('all four successful actions retain exact backend messages, repeat suffixes and original navigation', async () => {
  const success = receipts.filter(r => r.result.success && r.result.data.outcome === 'result');
  assert.equal(new Set(success.map(r => r.op)).size, 4);
  assert.ok(success.some(r => r.result.data.message.includes('\n\n')));
  for (const {op, result: row} of success) {
    const nodes = await render(names[op], '', row.data), text = textOf(nodes);
    assert.ok(text.includes(row.data.message)); assert.ok(text.includes(row.data.receipt.message)); assert.ok(commands(nodes).includes('/宗门大比'));
  }
});
test('all four failures keep exact domain and repeat messages without a follow-up API', async () => {
  const failures = receipts.filter(r => !r.result.success);
  assert.equal(new Set(failures.map(r => r.op)).size, 4);
  assert.ok(failures.some(r => r.result.middleware.replies.at(-1).text.includes('\n\n')));
  for (const {op, result: row} of failures) {
    const reply = row.middleware.replies.at(-1), nodes = await render(names[op], '', reply, true);
    assert.ok(textOf(nodes).includes(reply.text)); assert.ok(commands(nodes).includes('/宗门大比'));
  }
});
test('network errors for all four actions stop after one API attempt', async () => {
  state.transportError = true;
  try {for (const name of Object.values(names)) assert.ok(textOf(await render(name, '', {})).includes('网络超时'));}
  finally {state.transportError=false;}
});
