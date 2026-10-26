import { soulOverviewBlockedAdvice } from './helpers/soul-overview-recovery-delta.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { withoutExpectedAdvice } from './helpers/recovery-delta.mjs';
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
const state=globalThis.__soulOverview={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as detail} from './src/response/soulArtifact/detail/res.ts';export {default as info} from './src/response/soulArtifact/info/res.ts';export {default as oldDetail} from 'old-detail';export {default as oldInfo} from 'old-info';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'soul-overview',setup(b){
 b.onResolve({filter:/^old-(detail|info)$/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL('./fixtures/soul-'+a.path+'-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({resolveDir:process.cwd(),contents:`
 import {withBusinessRecovery} from '${resolve('src/response/businessRecovery.ts')}';
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const requestBackend=async()=>{const s=globalThis.__soulOverview;if(!s.kind.startsWith('old'))throw new Error('supplementary API');s.legacyCalls++;if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__soulOverview;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(op==='soul-artifacts.detail'?withBusinessRecovery(op,r.middleware.replies.at(-1)):r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSoulOverview','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_SOUL_OVERVIEW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,314);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('soul detail and equipped info preserve all original group/private layouts and server capabilities',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const kind=row.operation.endsWith('.detail')?'detail':'info';
  const actual=await run(kind,row,isPrivate);assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:row.operation,args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const advice=row.result.success?soulOverviewBlockedAdvice(row):kind==='detail'?[{command:'/储物袋 本命',text:'页内序号不能替代实例编号'},{command:'/我的本命物',text:'已炼化的本命物不在未炼化背包显示'}]:[{command:'/储物袋 本命',text:'不能据此判断没有本命物、未炼化或需要购买'},{command:'/我的信息',text:'不根据查询失败推断发生分离或返还'}];
  const comparable=withoutExpectedAdvice(actual,advice);let old=await run(kind==='detail'?'oldDetail':'oldInfo',row,isPrivate);
  if(kind==='info'&&!row.result.success){let removed=0;old=structuredClone(old);for(const nodes of old)for(const node of nodes){if(node.type!=='Markdown')continue;const i=node.value.findIndex(child=>child.type==='MD.blockquote'&&child.value[0]?.value==='可在储物袋中选择本命物进行炼化 ');if(i<0)continue;assert.equal(node.value[i-1].type,'MD.newline');assert.deepEqual(node.value[i].value.filter(child=>child.type==='MD.button').map(child=>child.options.data),['/储物袋 本命']);node.value.splice(i-1,2);removed++;}assert.equal(removed,1);const before=bubbleSemantics(old);const originalCommands=row.result.middleware.replies.at(-1).buttons.map(button=>button.command);before.commands=before.commands.filter(command=>command!=='/储物袋 本命'||originalCommands.includes(command));for(const command of originalCommands)if(!before.commands.includes(command))before.commands.push(command);before.commands.sort();assert.deepEqual(bubbleSemantics(comparable),before,row.state+' '+row.text);}
  else assert.deepEqual(comparable,old,row.state+' '+row.text);
 }
});
test('soul overview middleware uses parent next and transport/malformed receipts stop without supplementary requests',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run(row.operation.endsWith('.detail')?'detail':'info',row,false);assert.equal(state.calls.length,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
 for(const kind of ['detail','info'])for(const transport of [false,true]){state.transport=transport;await run(kind,{text:kind==='detail'?'/本命物详情 9':'/本命物信息',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('未获完整确认'));assert.ok(!JSON.stringify(state.sent).includes('transport'));}state.transport=false;
});
