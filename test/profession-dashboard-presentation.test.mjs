import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__professionDashboard={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:['myProfession'].map(n=>`export {default as ${n}} from './src/response/profession/${n}/res.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export * from './src/api/bot/profession-dashboard-query.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'professionDashboard',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/profession-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/response\/access\/fifthLayer$/},()=>({path:resolve('src/response/access/fifthLayerView.ts')}));
 b.onResolve({filter:/^@src$|^@src\/api$|^@src\/(utils\/useMessage|response\/(config|robotBusiness)|utils\/backendRepeatDetector)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/profession\/myProfession\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>{if(globalThis.__professionDashboard.error)throw new Error('read failed');return globalThis.__professionDashboard.app};`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const withBackendRepeatDetection=async()=>globalThis.__professionDashboard.result.middleware.replies.at(-1).text;
 export const getBackendSocialAccess=async()=>globalThis.__professionDashboard.access;
 export const writeContext=()=>{throw new Error("unexpected write API")};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected supplementary game API')};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__professionDashboard;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessProfessionDashboard','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=33);
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(h[name], e, ()=>state.next++);return state.sent;}
function original(row){state.error=false;
 if(row.result.success)return {code:'OK',data:h.parseProfessionDashboard(row.result.data)};
 const reply=row.result.middleware.replies.at(-1);
 if(reply.text==='炼气九层及以上方可查看职业系统。')return {code:'OK',data:{access:{canUseProfessionAndCave:false}}};
 return {code:'LOAD_FAILED'};
}
const names={'profession.dashboard':'myProfession'};
test('profession dashboard preserves original private/group overview, lingzhi view and refusal bubbles',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [true,false]){
  state.result=row.result;state.app=original(row);const name=names[row.op];const actual=await render(name,row,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.op,row.op);assert.deepEqual(state.args,row.args,row.text);assert.equal(actual.length,row.result.middleware.replies.at(-1)?.blocks?.length?2:1);assert.deepEqual(reviewedSemantics(actual),reviewedSemantics(await render('old_'+name,row,isPrivate)),row.text);
 }
});
test('profession dashboard delegates middleware to parent without business bubble or extra game HTTP',async()=>{
 const result=rows.find(r=>r.result.branch==='middleware').result;
 for(const [op,name]of Object.entries(names)){const row=rows.find(r=>r.op===op&&r.result.branch==='business');state.result=result;await render(name,row,false);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
});

test('profession dashboard DTO/transport failures never supplement the single game request',async()=>{
 for(const [op,name] of Object.entries(names))for(const transport of [true,false]){
  state.transport=transport;state.result={success:true,branch:'business',data:{}};const row=rows.find(r=>r.op===op&&r.result.branch==='business');
  await render(name,row,true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);
 }state.transport=false;
});

function reviewedSemantics(messages) {
 const result=bubbleSemantics(messages, ['/我的锻造']);
 result.text=result.text.replace('收获与照料积累经验，达到要求后自动提升灵药师等级。','').replace(/已开垦：\d+块/g,'').replace(/当前可开垦：\d+块（需备齐材料）/g,'').replace(/每块开垦消耗：【灵锄】×1、【灵土】×5/g,'').replace(/可开垦总上限：(\d+)块/g,'最大灵田数：$1').replace(/可开垦总上限 (\d+)块/g,'最多 $1块灵田').replace(/\s+/g,' ').trim();
 return result;
}
test('profession overview and lingzhi page show capacity, remaining count and cost',async()=>{
 const base=rows.find(r=>r.result.success&&r.result.data?.lingzhi?.unlocked&&r.result.data?.access?.canUseProfessionAndCave);
 for(const text of ['/我的职业','/我的职业 灵药师'])for(const remaining of [0,1]){
  const row={...base,text};state.result=structuredClone(base.result);
  Object.assign(state.result.data.lingzhi,{cultivatedCount:3,cultivatableCount:remaining,cultivationCostText:'每块开垦消耗：【灵锄】×1、【灵土】×5'});
  await render('myProfession',row,false);
  const output=bubbleSemantics(state.sent).text;
  assert.match(output,/已开垦：3块/);
  assert.ok(output.includes(`当前可开垦：${remaining}块（需备齐材料）`));
  assert.match(output,/每块开垦消耗：【灵锄】×1、【灵土】×5/);
  assert.equal(state.calls,1);
 }
});
