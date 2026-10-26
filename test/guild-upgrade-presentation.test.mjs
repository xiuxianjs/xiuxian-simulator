import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildUpgradePresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as level} from './src/response/guild/upgradeLevel/res.ts';export {default as vein} from './src/response/guild/upgradeVein/res.ts';export {default as shop} from './src/response/guild/upgradeShop/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildUpgradePresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildUpgradesCostsCapsRollbackAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_UPGRADE_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
const originalParagraphs=text=>text.split('\n').flatMap(line=>line.split(/(?<=[。；])/).map(part=>part.trim()).filter(Boolean));
for(const [kind,command,title] of [['level','/提升宗门等级','宗门升级'],['vein','/提升宗门灵脉','宗门灵脉升级'],['shop','/提升宗门商店','宗门商店升级']])test(kind+' preserves original heading, paragraph formatting and same-request reply',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.upgrade-'+kind)){
  const raw=row.result.success?row.result.data:row.result.middleware.replies.at(-1),nodes=await render(kind,command,raw,!row.result.success),text=textOf(nodes);
  assert.ok(text.includes(title));assert.deepEqual(nodes.filter(node=>node.type==='MD.text').map(node=>node.value),originalParagraphs(row.result.success?raw.message:raw.text));assert.deepEqual(commands(nodes),['/我','/属性面板','/查看主线','/我的活动','/商店']);
 }
});
test('upgrade network errors keep original title and one game request',async()=>{
 state.transportError=true;
 try{for(const kind of ['level','vein','shop']){const nodes=await render(kind,'/提升宗门',{});assert.ok(textOf(nodes).includes('网络超时'));}}
 finally{state.transportError=false;}
});
