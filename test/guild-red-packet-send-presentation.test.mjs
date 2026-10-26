import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildRedPacketSendPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as send} from './src/response/guild/sendRedPacket/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildRedPacketSendPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildRedPacketSendValidationTransactionsAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_GUILD_RED_PACKET_SEND_RESPONSE=([^|]+)\|(.+)/g)].map(m => JSON.parse(m[2]).data);
test('send usage retains choices and explains full funding, auto-claim and expiry recovery', async () => {
  for (const row of receipts.filter(r => r.success && r.data.outcome === 'usage')) {
    const nodes = await render('send', '/发红包', row.data), text = textOf(nodes), buttons = commands(nodes);
    assert.ok(text.includes('🧧 发红包')); assert.ok(text.includes('用法：/发红包 货币 份数 每份金额'));
    assert.ok(text.includes('货币：贡献点 / 灵晶 / 灵石')); assert.ok(text.includes('份数：5 / 10 / 15 / 20 / 25 / 30'));
    assert.ok(text.includes('金额：100 / 1000 / 10000 / 100000'));
    assert.ok(text.includes('先持有“份数×每份金额”的全额'));
    assert.ok(text.includes('发送者随后自动领取1份'));
    assert.ok(text.includes('过期未领完的剩余余额可由发送者'));
    assert.ok(!text.includes('到期后丢弃'));
    assert.ok(buttons.includes('/我的信息'));
    assert.ok(buttons.includes('/我发的红包'));
    for (const command of ['/发红包 灵石 5 100', '/发红包 灵晶 10 100', '/发红包 贡献点 15 100']) assert.ok(buttons.includes(command));
  }
});
test('send validation and domain errors retain exact messages without added repeat notices', async () => {
  for (const row of receipts.filter(r => !r.success)) {
    const reply = row.middleware.replies.at(-1), nodes = await render('send', '/发红包 灵石 5 100', reply, true);
    assert.ok(textOf(nodes).includes(reply.text)); assert.ok(commands(nodes).includes('/宗门红包')); assert.ok(commands(nodes).includes('/我发的红包'));
    assert.ok(!textOf(nodes).includes('🧧 红包发送成功'));
  }
});
test('successful sends keep exact server auto-claim receipt and navigation for all three currencies', async () => {
  let count = 0;
  for (const row of receipts.filter(r => r.success && r.data.outcome === 'result')) {
    const nodes = await render('send', '/发红包 灵石 5 100', row.data), text = textOf(nodes);
    assert.ok(text.includes(row.data.receipt.message)); assert.ok(text.includes('你已自动领取1份。'));
    assert.ok(commands(nodes).includes('/宗门红包')); assert.ok(commands(nodes).includes('/我发的红包')); count++;
  }
  assert.equal(count, 3);
});
test('send network errors stop after one API attempt, including the usage entry', async () => {
  state.transportError = true;
  try {
    for (const command of ['/发红包', '/发红包 灵石 5 100']) {
      const nodes = await render('send', command, {}); assert.ok(textOf(nodes).includes('网络超时'));
    }
  } finally { state.transportError = false; }
});
