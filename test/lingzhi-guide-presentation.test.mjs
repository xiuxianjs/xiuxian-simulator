import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__lingzhiGuide={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:['joinLingzhi'].map(n=>`export {default as ${n}} from './src/response/profession/${n}/res.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export * from './src/api/bot/lingzhi-robot-guide.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'lingzhiGuide',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/profession-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/response\/access\/fifthLayer$/},()=>({path:resolve('src/response/access/fifthLayerView.ts')}));
 b.onResolve({filter:/^@src$|^@src\/api$|^@src\/(utils\/useMessage|response\/(config|robotBusiness)|utils\/backendRepeatDetector)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/profession\/joinLingzhi\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>{if(globalThis.__lingzhiGuide.error)throw new Error('read failed');return globalThis.__lingzhiGuide.app};`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const useBackendRepeatDetection=()=>({Repeat:async()=>globalThis.__lingzhiGuide.result.middleware.replies.at(-1).text});export const withBackendRepeatDetection=async()=>globalThis.__lingzhiGuide.result.middleware.replies.at(-1).text;
 export const getBackendSocialAccess=async()=>globalThis.__lingzhiGuide.access;
 export const writeContext=()=>{throw new Error("unexpected write API")};export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected supplementary game API')};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__lingzhiGuide;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessLingzhiGuideV1AndState$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,33);
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(h[name], e, ()=>state.next++);return state.sent;}
function original(row){state.error=false;
 if(row.result.success)return h.parseRobotLingzhiGuide(row.result.data);
 return {code:'FAIL',data:{message:row.result.middleware.replies.at(-1).text.split('\n\n')[0]}};
}
const names={'profession.lingzhi-guide':'joinLingzhi'};
const compactGuide=nodes=>nodes.flatMap(node=>{
 if(node.type==='MD.newline')return [];
 if(Array.isArray(node.value))return [{...node,value:compactGuide(node.value)}];
 if(node.type==='MD.text'&&node.value==='从今日起，这方灵田便归你照料。记得常来浇灌、除虫、收割，草木也会回报你的耐心。')return [];
 return node.type==='MD.text'?[{...node,value:String(node.value).replace('“你日后照看的，不只是几株药草，而是一条长期供养修行的资源线。”','“待药香漫过田垄，便是草木回馈修行之时。”')}]:[node];
});
test('lingzhi guide preserves original private/group overview, lingzhi view and refusal bubbles',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [true,false]){
  state.result=row.result;state.app=original(row);const name=names[row.op];const actual=await render(name,row,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.op,row.op);assert.deepEqual(state.args,row.args,row.text);assert.equal(actual.length,row.result.middleware.replies.at(-1)?.blocks?.length?2:1);if(row.result.data?.session?.step===3){
   const content=JSON.stringify(actual);assert.match(content,/灵锄、灵土与聚灵草种/);assert.match(content,/成熟|收获后记得补种/);assert.doesNotMatch(content,/一柄灵锄/);
  }else assert.deepEqual(actual.map(compactGuide),(await render('old_'+name,row,isPrivate)).map(compactGuide),row.text);
 }
});
test('lingzhi guide delegates middleware to parent without business bubble or extra game HTTP',async()=>{
 const result=rows.find(r=>r.result.branch==='middleware').result;
 for(const [op,name]of Object.entries(names)){const row=rows.find(r=>r.op===op&&r.result.branch==='business');state.result=result;await render(name,row,false);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
});

test('lingzhi guide DTO/transport failures never supplement the single game request',async()=>{
 for(const [op,name] of Object.entries(names))for(const transport of [true,false]){
  state.transport=transport;state.result={success:true,branch:'business',data:{}};const row=rows.find(r=>r.op===op&&r.result.branch==='business');
  await render(name,row,true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);
 }state.transport=false;
});

test('lingzhi completion renders the server receipt and preserves historical no-reward messages',()=>{
 for(const message of ['已开放4块灵田。入门物资：灵锄×3、灵土×15、聚灵草种×8。','已有记录，本次未重复发放入门物资。']){
  assert.equal(h.parseRobotLingzhiGuide({completed:true,activation:{message}}).data.message,message);
 }
});
