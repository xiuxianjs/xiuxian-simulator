import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import { logger, ResultCode } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
logger.error=()=>{};
const state=globalThis.__attributePanel={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/attributes/update/res.ts';export {default as old} from 'old-menu';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'attribute-panel',setup(b){
 b.onResolve({filter:/^old-menu$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/attribute-panel-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:resolve('src/response/attributes/update')}));
 b.onResolve({filter:/^@src\/(img\/views\/AttributePanel|utils\/imageCdn|api\/bot\/identity)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^jsxp$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/api\/bot\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export default ()=>null;
 export class BackendAPIError extends Error{constructor(status,message){super(message);this.status=status}}
 export const getBackendRobotIdentity=async()=>({account:{status:'registered',playerId:1}});
 export const ImageCache={create:()=>({getOrCreate:async()=>globalThis.__attributePanel.image??null})};
 export const renderComponentIsHtmlToBuffer=()=>{throw new Error('unexpected render')};
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__attributePanel;if(!s.kind.startsWith('old'))throw new Error('supplementary API');s.legacyCalls++;s.query=args?.query;if(s.row.status!==200)throw new BackendAPIError(s.row.status,s.row.v1?.error?.message??'query failed');return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__attributePanel;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessAttributePanel','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_ATTRIBUTE_PANEL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,21);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('attribute panel renders Markdown, five progress bars and gated actions; preserves failure bubbles',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'attributes.panel',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  if (!row.result.success) {
   assert.deepEqual(actual,await run('old',row,isPrivate),row.state+' '+row.text);
   continue;
  }
  const result = framework.result;
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  const d = row.result.data;
  assert.ok(view.text.includes(`属性面板 · ${d.daoName}`));
  assert.ok(view.text.includes(`境界：${d.realmName}\nUID: ${d.uid}\n战力：${d.combatPower}`));
  assert.doesNotMatch(JSON.stringify(message.nodes), /MD.image|panel.png|面板图片渲染失败/);
  const quotes = message.nodes.flatMap(n => n.type === 'Markdown' ? n.value.filter(c => c.type === 'MD.blockquote') : []);
  const attr = inspectMessage([{ type: 'Markdown', value: quotes[0].value }]);
  assert.deepEqual(attr.commands, ['/服用 培元丹 1', '/服用 培元丹 3', '/服用 培元丹 5']);
  const bars = attr.text.match(/[▓░]{10}/g);
  assert.equal(bars.length, 5);
  for (const [i, label, key, maxKey] of [[0,'力量','strength','maxStrength'],[1,'智慧','intelligence','maxIntelligence'],[2,'体质','constitution','maxConstitution'],[3,'敏捷','agility','maxAgility'],[4,'气运','luck','maxLuck']]) {
   assert.ok(attr.text.includes(`${label}　${d[key]} / ${d[maxKey]}`));
   const filled = d[maxKey] > 0 ? Math.max(0,Math.min(10,Math.floor(d[key]/d[maxKey]*10))) : 0;
   assert.equal(bars[i], '▓'.repeat(filled)+'░'.repeat(10-filled));
  }
  for (const line of [
   `| 物理攻击 | ${d.physicalAttack} | 物理防御 | ${d.physicalDefense} |`,
   `| 法术攻击 | ${d.magicAttack} | 法术防御 | ${d.magicDefense} |`,
   `| 生命上限 | ${d.hp} | 灵力上限 | ${d.spiritualPower} |`,
   `| 速度 | ${d.speed} | 念力上限 | ${d.mentalPower} |`,
   `| 暴击率 | ${d.critRate}% | 暴击伤害 | ${d.critDamage}% |`,
   `| 抗暴率 | ${d.antiCritRate}% | 命中率 | ${d.hitRate}% |`,
   `| 闪避率 | ${d.dodgeRate}% | | |`
  ]) assert.ok(view.text.includes(line), line);
  assert.equal(view.commands.includes('/我的本命物'), d.access.canUseSoulArtifact);
  assert.equal(view.commands.includes('/道途印证'), d.access.canUseSoulPath);
  assert.equal(view.commands.includes('/经络'), d.access.canUseMeridian);
  assert.equal(view.commands.includes('/闭关'), !d.access.canUseMeridian);
  if (d.resourceRecovery) {
   assert.ok(view.text.includes(`回灵效率：${d.resourceRecovery.mp}%`));
   assert.ok(view.text.includes(`回念效率：${d.resourceRecovery.mental}%`));
  }
 }
});
test('attribute middleware calls parent next; transport or invalid receipt ends',async()=>{
 await run('current',rows.find(r=>r.state==='muted'),false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls.length,1);
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/属性面板',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('更新属性失败，请联系运营'));}state.transport=false;
});

test('attribute progress bars clamp empty, full, overflow and zero caps without changing displayed values', async () => {
 const row = structuredClone(rows.find(r => r.result.success && r.result.data));
 Object.assign(row.result.data, {strength:0,maxStrength:100,intelligence:25,maxIntelligence:100,constitution:100,maxConstitution:100,agility:120,maxAgility:100,luck:3,maxLuck:0});
 await run('current',row,false);
 const result = framework.result;
 const message = result.messages[0];
 assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
 const text = inspectMessage(message.nodes).text;
 assert.deepEqual(text.match(/[▓░]{10}/g), ['░'.repeat(10),'▓'.repeat(2)+'░'.repeat(8),'▓'.repeat(10),'▓'.repeat(10),'░'.repeat(10)]);
 assert.ok(text.includes('敏捷　120 / 100'));
 assert.ok(text.includes('气运　3 / 0'));
});
