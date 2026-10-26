import { accelerationCommandAdvice } from './helpers/cave-acceleration-recovery-delta.mjs';
import { unsafeCaveFixture, assertCaveInputRefusal } from './helpers/cave-input-recovery-delta.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { caveSnapshotAdvice, hasCaveSnapshotFailure } from './helpers/cave-snapshot-recovery-delta.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { withoutExpectedAdvice, replaceExpectedText } from './helpers/recovery-delta.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__caveAction={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as logs} from './src/response/cavePlot/action/res.ts';export {default as old_logs} from 'old-logs';export * from './src/api/bot/cave-command.ts';export * from './src/api/bot/cave-robot-command.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'caveAction',setup(b){
 b.onResolve({filter:/^old-logs$/},()=>({path:'logs',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/cave-action-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src$|^@src\/api$|^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});export const requestBackend=async()=>{globalThis.__caveAction.legacyCalls++;return globalThis.__caveAction.originalData};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__caveAction;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessCaveActionsV1StateAndReceipts$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,278);
const old=[...output.matchAll(/ROBOT_CAVE_ACTION_V1=([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],args:JSON.parse(m[2]),text:m[3],status:Number(m[4]),body:JSON.parse(m[5])}));assert.equal(old.length,272);
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;state.legacyCalls=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(h[name], e, ()=>state.next++);return state.sent;}
function withoutExpectedShop(messages, expected){
 const copy=structuredClone(messages);let found=0;
 for(const nodes of copy)for(const node of nodes)if(node.type==='Markdown'){
  const i=node.value.findIndex(child=>child.type==='MD.button'&&child.options?.data==='/商店 万宝楼');
  if(i<0)continue;
  assert.equal(node.value[i].value,'[万宝楼]');
  assert.deepEqual(node.value[i-1],{type:'MD.text',value:' '});
  node.value.splice(i-1,2);found++;
 }
 assert.equal(found,expected?1:0,'expected shop navigation count');return copy;
}
test('cave actions preserve original private/group pagination and access/guide bubbles',async()=>{
 for(let n=0;n<old.length;n++)for(const isPrivate of [true,false]){
  if(old[n].status!==200)continue;
  const row=rows[n];state.result=row.result;state.originalData=old[n].body.data;
  const actual=await render('logs',row,isPrivate);if(unsafeCaveFixture(row)){assertCaveInputRefusal(state,actual);continue;}assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.deepEqual(state.args,row.args);assert.equal(actual.length,1);
  const preview=row.result.data?.mode==='preview'?row.result.data.preview:null;
  const advice=row.args.mode==='usage'?[{text:'先查看该地块预览',command:'/灵田'}]:row.op==='cave.accelerate'&&row.result.data?.mode==='command'?accelerationCommandAdvice(row):hasCaveSnapshotFailure(row.result.data?.result)?caveSnapshotAdvice():preview&&!preview.found?[{text:'无需再购买加速物资',command:'/灵田'}]:[];
  const comparable=withoutExpectedShop(withoutExpectedAdvice(actual,advice),Boolean(preview?.found));
  if(row.args.mode==='usage'){let changed=0;for(const nodes of comparable)for(const node of nodes)if(node.type==='Markdown')for(const child of node.value)if(child.type==='MD.button'&&child.options?.data==='/灵田'){assert.equal(child.value,'[我的灵田]');child.value='[灵田]';changed++;}assert.equal(changed,1,'one retained service button label');}
  const expected=replaceExpectedText(await render('old_logs',row,isPrivate),'当前无可用加速道具，或本轮加速次数已用尽。','暂无可用的加速道具');
  assert.deepEqual(comparable,expected,old[n].state+row.text);assert.equal(state.legacyCalls,row.args.mode==='usage'?0:1);
 }
});
test('cave actions service failures give feedback and end without any supplementary API',async()=>{
 for(let n=0;n<old.length;n++)if(old[n].status!==200){state.result=rows[n].result;const actual=await render('logs',rows[n],false);if(unsafeCaveFixture(rows[n])){assertCaveInputRefusal(state,actual);continue;}assert.equal(state.calls,1);assert.equal(state.legacyCalls,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.ok(state.result.middleware.replies.at(-1).text);assert.ok(bubbleSemantics(state.sent).text.includes(state.result.middleware.replies.at(-1).text.replace(/\s+/g,' ').trim()));}
});
test('cave actions middleware delegates once and transport/DTO failures never supplement game HTTP',async()=>{
 state.result=rows.at(-1).result;await render('logs',rows[0],false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls,1);
 for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render('logs',rows[0],true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.equal(state.legacyCalls,0);}state.transport=false;
 for(const v of [null,{}, {mode:'other'}, {mode:'preview',preview:{}}, {mode:'command',result:{}}])assert.throws(()=>h.parseRobotCaveAction(v));
});
