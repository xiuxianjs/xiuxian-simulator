import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { withoutExpectedAdvice } from './helpers/recovery-delta.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__professionTools={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:['replaceEquip'].map(n=>`export {default as ${n}} from './src/response/profession/${n}/res.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export * from './src/api/bot/profession-robot-tools.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'professionTools',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/profession-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/response\/access\/fifthLayer$/},()=>({path:resolve('src/response/access/fifthLayerView.ts')}));
 b.onResolve({filter:/^@src$|^@src\/api$|^@src\/(utils\/useMessage|response\/(config|robotBusiness)|utils\/backendRepeatDetector)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/profession\/replaceEquip\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>{if(globalThis.__professionTools.error)throw new Error('read failed');return globalThis.__professionTools.app};`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const withBackendRepeatDetection=async()=>globalThis.__professionTools.result.middleware.replies.at(-1).text;
 export const getBackendSocialAccess=async()=>globalThis.__professionTools.access;
 export const writeContext=()=>{throw new Error("unexpected write API")};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected supplementary game API')};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__professionTools;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessProfessionTools','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=77);
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(h[name], e, ()=>state.next++);return state.sent;}
function original(row){state.error=false;
 if(row.result.success)return h.parseProfessionRobotTools(row.result.data);
 const reply=row.result.middleware.replies.at(-1);
 if(reply.text==='替换职业工具失败，请稍后重试')return {code:'ERROR'};
 return {code:'FAILED',message:reply.text.slice(2).split('\n\n')[0],uid:1};
}
const names={'profession.replace-tool':'replaceEquip'};
test('profession tools preserve original private/group list, replacement, refusal and repeat bubbles',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [true,false]){
  state.result=row.result;state.app=original(row);const name=names[row.op];const actual=await render(name,row,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.op,row.op);assert.deepEqual(state.args,row.args,row.text);assert.equal(actual.length,row.result.middleware.replies.at(-1)?.blocks?.length?2:1);
  const emptyList=state.app.code==='LIST'&&state.app.data.tools.length===0;
  const comparable=emptyList?withoutExpectedAdvice(actual,[{text:'核对已装备、锁定状态、工具分类和装备条件',command:'/储物袋 天工'}]):actual;
  const expected=structuredClone(await render('old_'+name,row,isPrivate));
  // Current routing uses /替换 for these buttons; both aliases reach this handler.
  for(const nodes of expected)for(const node of nodes)if(node.type==='Markdown')for(const child of node.value){
   if(child.type==='MD.button'&&/^\/切换 \d+$/.test(child.options?.data??''))child.options.data=child.options.data.replace('/切换 ','/替换 ');
  }
  assert.deepEqual(comparable,expected,row.text);
 }
});
test('profession tools delegate middleware to parent without business bubble or extra game HTTP',async()=>{
 const result=rows.find(r=>r.result.branch==='middleware').result;
 for(const [op,name]of Object.entries(names)){const row=rows.find(r=>r.op===op&&r.result.branch==='business');state.result=result;await render(name,row,false);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
});

test('profession tools DTO/transport failures never supplement the single game request',async()=>{
 for(const [op,name] of Object.entries(names))for(const transport of [true,false]){
  state.transport=transport;state.result={success:true,branch:'business',data:{}};const row=rows.find(r=>r.op===op&&r.result.branch==='business');
  await render(name,row,true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);
 }state.transport=false;
});
