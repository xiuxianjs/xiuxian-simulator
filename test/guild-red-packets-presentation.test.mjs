import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildRedPacketsPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as list} from './src/response/guild/redPacketList/res.ts';export {default as mine} from './src/response/guild/myRedPackets/res.ts';export {default as claim} from './src/response/guild/claimRedPacket/res.ts';export {default as recycle} from './src/response/guild/recycleRedPacket/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildRedPacketsPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildRedPacketsReadSettlementRollbackAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_GUILD_RED_PACKETS_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[3]).data }));
test('available packets keep original amount, remaining time, claim buttons and page errors', async () => {
  for (const row of receipts.filter(r => r.op === 'guild.red-packets')) {
    const raw = row.result.success ? row.result.data : row.result.middleware.replies.at(-1);
    for (const page of [1, 99]) {
      const nodes = await render('list', '/宗门红包 ' + page, raw, !row.result.success), text = textOf(nodes), buttons = commands(nodes);
      if (!row.result.success) { assert.ok(text.includes(raw.text)); continue; }
      if (!raw.packets.length) { assert.ok(text.includes('没有可领红包。')); assert.ok(buttons.includes('/发红包')); assert.ok(buttons.includes('/我发的红包')); continue; }
      const totalPages = Math.ceil(raw.packets.length / 5);
      assert.ok(text.includes(`【${raw.guildName || '未知宗门'}】宗门红包`));
      if (page > totalPages) { assert.ok(text.includes(`页码超出范围：总页数为 ${totalPages} 页`)); assert.ok(!buttons.some(b => b.startsWith('/领红包 '))); continue; }
      for (const packet of raw.packets.slice(0, 5)) {
        assert.ok(text.includes(`【${packet.id}】 ${packet.currencyName}`)); assert.ok(text.includes(`（剩余${packet.remaining}）`));
        if (packet.expiresAt) assert.ok(text.includes(`⏳${packet.remainingTimeText}`));
        assert.ok(buttons.includes(`/领红包 ${packet.id}`));
      }
    }
  }
});
test('sent packets keep statuses, recycle amounts and five-row pagination', async () => {
  for (const row of receipts.filter(r => r.op === 'guild.my-red-packets')) {
    const raw = row.result.success ? row.result.data : row.result.middleware.replies.at(-1);
    for (const page of [1, 2, 99]) {
      const nodes = await render('mine', '/我发的红包 ' + page, raw, !row.result.success), text = textOf(nodes), buttons = commands(nodes);
      if (!row.result.success) { assert.ok(text.includes(raw.text)); continue; }
      if (!raw.packets.length) { assert.ok(text.includes('你还没有发过红包。')); continue; }
      const totalPages = Math.ceil(raw.packets.length / 5);
      if (page > totalPages) { assert.ok(text.includes(`页码超出范围：总页数为 ${totalPages} 页`)); continue; }
      assert.ok(text.includes(`【${raw.guildName || '未知宗门'}】我发的红包`));
      for (const packet of raw.packets.slice((page - 1) * 5, page * 5)) {
        assert.ok(text.includes(`【${packet.id}】${packet.currencyName}×${packet.perAmount} ${packet.claimedCount}/${packet.packetCount}份 ${packet.statusText}`));
        assert.equal(buttons.includes(`/回收红包 ${packet.id}`), packet.canRecycle);
        if (packet.canRecycle) assert.ok(text.includes(`回收 ${packet.recycleAmount}${packet.currencyName}`));
      }
      assert.ok(buttons.includes('/发红包')); assert.ok(buttons.includes('/宗门红包'));
    }
  }
});
test('claim and recycle keep receipt messages and their original navigation on success and failure', async () => {
  for (const [op, name, command, footer] of [['guild.red-packet-claim', 'claim', '/领红包 1', '/宗门红包'], ['guild.red-packet-recycle', 'recycle', '/回收红包 11', '/我发的红包']]) {
    for (const row of receipts.filter(r => r.op === op)) {
      const raw = row.result.success ? row.result.data : row.result.middleware.replies.at(-1);
      const nodes = await render(name, command, raw, !row.result.success);
      assert.ok(textOf(nodes).includes(row.result.success ? raw.message : raw.text));
      assert.ok(commands(nodes).includes(footer));
    }
  }
});
test('red packet network failures stop after one API attempt', async () => {
  state.transportError = true;
  try {
    for (const [name, command] of [['list', '/宗门红包'], ['mine', '/我发的红包'], ['claim', '/领红包 1'], ['recycle', '/回收红包 11']]) {
      const nodes = await render(name, command, {}); assert.ok(textOf(nodes).includes('网络超时'));
    }
  } finally { state.transportError = false; }
});

test('invalid packet arguments reach backend feedback and retain original claim/recycle navigation',async()=>{
 const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessRedPacket(InvalidRouteTaskAndReplay|NonFiniteWireRefusal)$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const rows=[...output.matchAll(/ROBOT_RED_PACKET_INVALID_ROUTE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,72);
 const nonfinite=[...output.matchAll(/ROBOT_RED_PACKET_NONFINITE_ROUTE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(nonfinite.length,2);
 for(const row of [...rows.filter(r=>!r.task&&!r.muted),...nonfinite]) {
  const claim=row.operation==='guild.red-packet-claim';
  const nodes=await render(claim?'claim':'recycle',row.text??'/'+row.input,row.result.middleware.replies[0],true);
  assert.ok(textOf(nodes).includes(row.result.middleware.replies[0].text));
  assert.ok(commands(nodes).includes(claim?'/宗门红包':'/我发的红包'));
 }
});
