import { soulQueryAdvice } from './helpers/soul-query-recovery-delta.mjs';
import { soulActionAdvice } from './helpers/soul-nurture-recovery-delta.mjs';
import { withoutExpectedAdvice, replaceExpectedText } from './helpers/recovery-delta.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__soulState={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const exports=['panel','path','source'].map(name=>`export {default as current${name}} from './src/response/soulPath/${name}/res.ts';export {default as old${name}} from 'old-${name}';`).join('\n');
const bundle=await build({stdin:{contents:exports,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'soul-state',setup(b){
 b.onResolve({filter:/^old-(panel|path|source)$/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL('./fixtures/soul-path-'+a.path+'-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:resolve('src/response/soulPath/'+a.path)}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const writeContext=()=>{throw new Error('unexpected write API')};
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__soulState;if(!s.kind.startsWith('old'))throw new Error('supplementary API');s.legacyCalls++;s.query={operation,args};if(s.row.status!==200)throw new Error(s.row.v1?.error?.message??'HTTP '+s.row.status);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__soulState;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSoulPathState','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_SOUL_STATE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,110);
const target=row=>/神魂材料/.test(row.text)?'source':/元婴神魂|元婴面板/.test(row.text)?'panel':'path';
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageId:'soul-state',MessageText:row.text,isPrivate};await framework.run(handlers[kind+target(row)], e, ()=>state.next++);return structuredClone(state.sent);}
test('soul state preserves original panel, paths and material-source bubbles',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  if(row.text==='/元婴道途 未知'){assert.equal(state.calls.length,0);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.ok(bubbleSemantics(actual).text.includes('道途名称无效'));assert.ok(bubbleSemantics(actual).commands.includes('/元婴道途'));assert.ok(!bubbleSemantics(actual).commands.some(command=>/选择道途|切换道途/.test(command)));continue;}
  assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'soul-path.state',args:{}});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const blocked=row.result.data?.panel;
  const comparable=row.result.success?(target(row)==='panel'&&(blocked.nurtureUnavailable||blocked.actionUnavailable)?withoutExpectedAdvice(actual,soulActionAdvice(blocked.nurtureUnavailable||blocked.actionUnavailable)):actual):withoutExpectedAdvice(actual,soulQueryAdvice(row.result.middleware.replies.at(-1).text));
  let old=await run('old',row,isPrivate);
  if(target(row)==='path'&&row.result.success&&row.result.data.panel.switchCooldownActive&&row.result.data.pathSwitchAvailableAt){const when=row.result.data.pathSwitchAvailableAt;const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(when));old=replaceExpectedText(old,'转修冷却至 '+new Date(when).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}),'转修冷却至 '+parts);}
  if(row.result.success)assert.deepEqual(comparable,old,row.state+' '+row.text);
  else assert.deepEqual(bubbleSemantics(comparable),bubbleSemantics(old),row.state+' '+row.text);
  assert.equal(state.legacyCalls,1);assert.equal(state.query.operation,'get_players_id_soul_path');
 }
});
test('soul state middleware calls parent next; malformed DTO and transport error end',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){
  if(row.text==='/元婴道途 未知'){await run('current',row,false);assert.equal(state.calls.length,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.ok(bubbleSemantics(state.sent).text.includes('道途名称无效'));continue;}
  await run('current',row,false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls.length,1);
 }
 for(const transport of [false,true])for(const row of rows.filter(r=>r.state==='initial')){
  if(row.text==='/元婴道途 未知'){const actual=await run('current',row,false);assert.equal(state.calls.length,0);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.ok(bubbleSemantics(actual).text.includes('道途名称无效'));continue;}
  state.transport=transport;await run('current',{...row,result:{success:true,branch:'business',data:{}}},false);
  assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);
 }state.transport=false;
});
