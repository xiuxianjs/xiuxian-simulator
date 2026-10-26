import { withoutExpectedAdvice } from './helpers/recovery-delta.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__storageLock={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as currentLock} from './src/response/storage/lock/res.ts';export {default as currentUnlock} from './src/response/storage/unlock/res.ts';export {default as originalLock} from 'old-lock';export {default as originalUnlock} from 'old-unlock';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'storage-lock',setup(b){
 b.onResolve({filter:/^old-(lock|unlock)$/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL('./fixtures/storage-'+a.path+'-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({resolveDir:process.cwd(),contents:`
 import { withBusinessRecovery } from ${JSON.stringify(resolve('src/response/businessRecovery.ts'))};
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});export const withBackendRepeatDetection=async(b,u,c,m)=>m;
 export const requestBackend=async()=>{const s=globalThis.__storageLock;if(s.kind!=='original')throw new Error('supplementary API');s.legacyCalls++;if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__storageLock;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(withBusinessRecovery(op,r.middleware.replies.at(-1)));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessStorageLock','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
const rows=[...output.matchAll(/ROBOT_STORAGE_LOCK=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,442);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind+(row.operation==='storage.lock'?'Lock':'Unlock')], e, ()=>state.next++);return structuredClone(state.sent);}
function withoutKnownLockRecovery(messages,row){
 const text=row.result.middleware.replies.at(-1)?.text??'';
 const partial=row.result.success&&row.result.data.result.kind==='name'&&row.result.data.result.name.issues.length>0;
 let command='/储物袋',expectedText='前段完成不会因后段异常而回滚';
 if(!row.result.success){
  const category=text.match(/(?:^|\n)分类[:：]\s*([^\n]+)|分类["“]([^"”]+)["”]/);
  const first=(category?.[1]??category?.[2]??'').split('-')[0];
  if(['材料','道具','装备','天工','功法','本命'].includes(first))command=`/储物袋 ${first}`;
  if(/参数错误|物品ID必须/.test(text)){command='/储物袋';expectedText='模板ID和页内序号不能替代实例ID';}
  else if(text.includes('上架中')){command='/我的上架';expectedText='是否下架由你决定';}
  else if(text.includes('已装备的装备')){command='/我的装备';expectedText='不自动卸下后操作';}
  else if(text.includes('已启用的天工')){command='/储物袋 天工';expectedText='不自动替换或卸下工具';}
  else if(text.includes('已学习的功法')){command='/储物袋 功法';expectedText='不自动卸下、分解或重复学习';}
  else if(/不存在|不属于你|未找到名为|可能原因|已被锁定|未被锁定|物品已锁定|物品未锁定/.test(text))expectedText='不自动反向操作或重放整批';
 }
 const copy=withoutExpectedAdvice(messages,!row.result.success||partial?[{command,text:expectedText}]:[]);
 let found=0;
 for(const nodes of copy)for(const node of nodes){
  if(node.type!=='Markdown')continue;
  const index=node.value.findIndex(child=>child.type==='MD.text'&&child.value==='另有项目未完成或需核对，请先查看各分类当前状态。');
  if(index<0)continue;
  assert.equal(node.value[index-1].type,'MD.newline');node.value.splice(index-1,2);found++;
 }
 assert.equal(found,partial?1:0);
 return copy;
}
test('storage lock/unlock preserve original group/private bubbles, category quotes and failure button nodes',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:row.operation,args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  assert.deepEqual(bubbleSemantics(withoutKnownLockRecovery(actual,row)),bubbleSemantics(await run('original',row,isPrivate)),row.state+' '+row.text);
 }
});
test('middleware invokes parent next; transport and malformed receipts end with original error and no extra API',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row,false);assert.equal(state.calls.length,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
 for(const transport of [false,true]){state.transport=transport;await run('current',{operation:'storage.lock',text:'/锁定 材料',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('锁定物品失败，请稍后再试或联系运营。'));}state.transport=false;
});
