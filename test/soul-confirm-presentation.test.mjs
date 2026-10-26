import { goTestFixture } from './helpers/go-fixture.mjs';
import { soulPreviewAdvice, withoutSoulReceiptNote } from './helpers/soul-nurture-recovery-delta.mjs';
import { withoutExpectedAdvice } from './helpers/recovery-delta.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__soulConfirm={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const exports="export {default as current} from './src/response/soulPath/confirm/res.ts';export {default as old} from 'old-confirm';";
const bundle=await build({stdin:{contents:exports,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'soul-state',setup(b){
 b.onResolve({filter:/^old-(confirm)$/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL('./fixtures/soul-'+a.path+'-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:resolve('src/response/soulPath/'+a.path)}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const writeContext=request=>{if(!request?.idempotencyKey)throw new Error('missing identity');return request};
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__soulConfirm;if(!s.kind.startsWith('old'))throw new Error('supplementary API');s.legacyCalls++;s.query={operation,args};if(s.row.status!==200)throw new Error(s.row.v1?.error?.message??'HTTP '+s.row.status);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__soulConfirm;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSoulConfirm','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_SOUL_CONFIRM=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,28);
const validToken=value=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.startsWith('choose:')?value.slice(7):value);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageId:'soul-state',MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('soul confirm preserves original success, refusal and usage bubbles',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  if(!validToken(row.arguments.token)){assert.equal(state.calls.length,0);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.ok(bubbleSemantics(actual).text.includes('凭证格式无效'));assert.ok(!bubbleSemantics(actual).commands.some(command=>command.startsWith('/确认神魂')));continue;}
  assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'soul-path.confirm',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const comparable=row.result.success?withoutSoulReceiptNote(actual,'本条为确认回执；重复确认可能回看原结果，不代表再次获得效果，当前状态请查看面板。'):withoutExpectedAdvice(actual,soulPreviewAdvice(row.result.middleware.replies.at(-1).text));
  const old=await run('old',row,isPrivate);
  if(row.result.success)assert.deepEqual(comparable,old,row.state+' '+row.text);
  else {const before=bubbleSemantics(old);for(const command of ['/道途印证','/元婴道途','/元婴神魂'])assert.ok(before.commands.includes(command));before.commands=before.commands.filter(command=>!['/道途印证','/元婴道途','/元婴神魂'].includes(command));assert.deepEqual(bubbleSemantics(comparable),before,row.state+' '+row.text);}
  assert.equal(state.legacyCalls,1);
  assert.equal(state.query.operation,row.kind==='choose'?'post_players_id_soul_path_choose_confirm':'post_players_id_soul_path_action_confirm');
 }
});
test('soul confirm middleware calls parent next; malformed DTO and transport error end',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){
  await run('current',row,false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls.length,1);
 }
 for(const transport of [false,true])for(const row of rows.filter(r=>r.state==='ready')){
  state.transport=transport;await run('current',{...row,result:{success:true,branch:'business',data:{}}},false);
  assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);
 }state.transport=false;
});
