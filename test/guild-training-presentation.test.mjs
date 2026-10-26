import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildTrainingPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as training} from './src/response/guild/battleTraining/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildTrainingPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
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


const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGuildTrainingStateCostsPermissionsRollbackAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:4*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GUILD_TRAINING_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[3]).data}));
test('training state retains resources, locked guidance and all permission-based quote buttons',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.training-overview')){
  const raw=row.result.success?row.result.data:row.result.middleware.replies.at(-1),nodes=await render('training','/宗门战备',raw,!row.result.success),text=textOf(nodes),buttons=commands(nodes);
  assert.ok(text.includes('宗门战备'));assert.ok(buttons.includes('/我的宗门'));
  if(!row.result.success){assert.ok(text.includes(raw.text));continue;}
  assert.ok(text.includes(`宗门：${raw.guildName} · ${raw.guildLevel}级`));assert.ok(text.includes(`宗门声望：${raw.prestige} ｜ 宗门灵石：${raw.spiritStone}`));assert.ok(text.includes(`个人贡献点：${raw.contributionPoints}`));
  if(!raw.unlocked){assert.ok(text.includes('宗门达到2级后，方可开启团队战阵与个人战备。'));assert.ok(!buttons.some(b=>b.startsWith('/宗门战备 团队')));continue;}
  for(const [branch,lines] of [['团队',raw.team],['个人',raw.personal]])for(const line of lines){assert.ok(text.includes(`${line.name}：${line.level}/${line.maxLevel}`));assert.ok(text.includes(`效果：${line.effectText}`));const command='/宗门战备 '+branch+' '+line.key,available=branch==='团队'?!!(line.nextCostPrestige&&line.nextCostSpiritStone&&raw.canUpgradeTeam):!!line.nextCostContribution;assert.equal(buttons.includes(command),available);}
  for(const command of ['/宗门主线','/灵脉攻防战','/宗门大比'])assert.ok(buttons.includes(command));assert.ok(text.includes('生效范围：宗门主线、灵脉攻防战、宗门大比。'));
 }
});
test('team and personal upgrade receipts retain effects, costs and branch-specific remaining resources',async()=>{
 for(const row of receipts.filter(r=>r.op==='guild.training-upgrade')){
  const raw=row.result.success?row.result.data:row.result.middleware.replies.at(-1),command=row.result.success?'/宗门战备 '+raw.branch+' '+raw.key:'/宗门战备 团队 命',nodes=await render('training',command,raw,!row.result.success),text=textOf(nodes),buttons=commands(nodes);
  assert.ok(buttons.includes('/我的宗门'));
  if(!row.result.success){assert.ok(text.includes(raw.text));continue;}
  assert.ok(text.includes(`升级成功：${raw.name}提升至${raw.newLevel}级`));assert.ok(text.includes(`当前效果：${raw.effectText}`));assert.ok(text.includes(`本次消耗：${raw.costText}`));assert.ok(buttons.includes('/宗门战备'));
  if(raw.branch==='团队'){assert.ok(text.includes(`宗门资源：声望${raw.prestige} ｜ 灵石${raw.spiritStone}`));assert.ok(!text.includes('剩余贡献点：'));}
  else{assert.ok(text.includes(`剩余贡献点：${raw.contributionPoints}`));assert.ok(!text.includes('宗门资源：'));}
 }
});
test('training network errors preserve footer without retrying a game API',async()=>{
 state.transportError=true;
 try{for(const command of ['/宗门战备','/宗门战备 个人 攻']){const nodes=await render('training',command,{});assert.ok(textOf(nodes).includes('网络超时'));assert.ok(commands(nodes).includes('/我的宗门'));}}
 finally{state.transportError=false;}
});
