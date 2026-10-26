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
const state=globalThis.__soulPreview={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const exports="export {createSoulPreviewHandler as current} from './src/response/soulPath/preview.ts';export {createSoulPreviewHandler as old} from 'old-preview';";
const bundle=await build({stdin:{contents:exports,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'soul-state',setup(b){
 b.onResolve({filter:/^old-(preview)$/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL('./fixtures/soul-'+a.path+'-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:resolve('src/response/soulPath')}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const writeContext=request=>{if(!request?.idempotencyKey)throw new Error('missing identity');return request};
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__soulPreview;if(!s.kind.startsWith('old'))throw new Error('supplementary API');s.legacyCalls++;s.query={operation,args};if(s.row.status!==200)throw new Error(s.row.v1?.error?.message??'HTTP '+s.row.status);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__soulPreview;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSoulPreview','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_SOUL_PREVIEW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,216);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageId:'soul-state',MessageText:row.text,isPrivate};await framework.run(handlers[kind](row.action,row.command), e, ()=>state.next++);return structuredClone(state.sent);}
test('soul preview preserves original success, refusal and usage bubbles',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  if(['advance','reroll'].includes(row.action)&&row.text.trim().replace(/^[!！/#＃]/,'').trim()!==row.command){assert.equal(state.calls.length,0);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.ok(bubbleSemantics(actual).text.includes('参数错误'));assert.ok(!bubbleSemantics(actual).commands.some(command=>command.startsWith('/确认神魂')));continue;}
  assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'soul-path.'+row.action+'-preview',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const comparable=row.result.success?withoutSoulReceiptNote(actual,'本次仅生成预览，尚未执行；确认时重新检查凭证与状态，返回面板不会自动确认或取消凭证。'):withoutExpectedAdvice(actual,soulPreviewAdvice(row.result.middleware.replies.at(-1).text));
  const old=await run('old',row,isPrivate);const scrub=value=>JSON.parse(JSON.stringify(value).replaceAll(row.result.data?.token??'NEVER_REPLACE_NEW','PREVIEW_TOKEN').replaceAll(row.v1?.data?.token??'NEVER_REPLACE_OLD','PREVIEW_TOKEN'));
  if(row.result.success)assert.deepEqual(scrub(comparable),scrub(old),row.state+' '+row.text);
  else{const before=bubbleSemantics(old);for(const command of ['/元婴道途','/神魂材料来源'])assert.ok(before.commands.includes(command));before.commands=before.commands.filter(command=>!['/元婴道途','/神魂材料来源'].includes(command));assert.deepEqual(bubbleSemantics(comparable),before,row.state+' '+row.text);}
  assert.equal(state.legacyCalls,row.valid?1:0);
  if(row.valid)assert.equal(state.query.operation,row.action==='choose'?'post_players_id_soul_path_choose_preview':'post_players_id_soul_path_action_preview');
 }
});
test('soul preview middleware calls parent next; malformed DTO and transport error end',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){
  if(['advance','reroll'].includes(row.action)&&row.text.trim().replace(/^[!！/#＃]/,'').trim()!==row.command){const actual=await run('current',row,false);assert.equal(state.calls.length,0);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.ok(bubbleSemantics(actual).text.includes('参数错误'));assert.ok(!bubbleSemantics(actual).commands.some(command=>command.startsWith('/确认神魂')));continue;}
  await run('current',row,false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls.length,1);
 }
 for(const transport of [false,true])for(const row of rows.filter(r=>r.state==='initial'&&r.action==='choose'&&r.valid)){
  state.transport=transport;await run('current',{...row,result:{success:true,branch:'business',data:{}}},false);
  assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);
 }state.transport=false;
});
