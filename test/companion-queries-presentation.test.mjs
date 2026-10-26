import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__companionQueries={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:['info','dailyTask','giftRecords'].map(n=>`export {default as ${n}} from './src/response/companion/${n}/res.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export * from './src/api/bot/companion-robot-query.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'companionQueries',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/companion-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/response\/access\/fifthLayer$/},()=>({path:resolve('src/response/access/fifthLayerView.ts')}));
 b.onResolve({filter:/^@src$|^@src\/api$|^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/companion\/(info|dailyTask|giftRecords)\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>{if(globalThis.__companionQueries.error)throw new Error('read failed');return globalThis.__companionQueries.app};`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const getBackendSocialAccess=async()=>globalThis.__companionQueries.access;
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected supplementary game API')};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__companionQueries;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessCompanionQueries','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_COMPANION_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=30);
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(h[name], e, ()=>state.next++);return state.sent;}
function original(row){state.error=false;state.access={ok:true,realmName:'炼气'};
 if(row.result.success){if(row.op==='companion.info')return{code:'OK',data:h.parseRobotCompanionInfo(row.result.data)};if(row.op==='companion.tasks')return h.parseRobotCompanionTasks(row.result.data);return{code:'OK',data:h.parseRobotGiftRecords(row.result.data,row.args.mode)};}
 const reply=row.result.middleware.replies.at(-1);
 if(reply.buttons[0]?.command==='/我的境界'){const realmName=reply.text.split('：').at(-1);state.access={ok:false,realmName};return{code:row.op==='companion.info'?'ACCESS_DENIED':'LOCKED',data:{realmName}};}
 if(reply.buttons[0]?.command==='/结为道侣')return{code:'NO_COMPANION',data:{message:reply.text}};
 if(row.op==='companion.gift-records')return{code:'LOAD_FAILED',data:{message:reply.text}};
 state.error=true;return null;
}
const names={'companion.info':'info','companion.tasks':'dailyTask','companion.gift-records':'giftRecords'};
test('companion info/tasks/gift records preserve native private/group bubbles and original page/claim behavior',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [true,false]){
  state.result=row.result;state.app=original(row);const name=names[row.op];const actual=await render(name,row,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.op,row.op);assert.deepEqual(state.args,row.args,row.text);assert.equal(actual.length,1);assert.deepEqual(actual,await render('old_'+name,row,isPrivate),row.text);
 }
});
test('companion queries delegate middleware to parent without business bubble or extra game HTTP',async()=>{
 const result=rows.find(r=>r.result.branch==='middleware').result;
 for(const [op,name]of Object.entries(names)){const row=rows.find(r=>r.op===op&&r.result.branch==='business');state.result=result;await render(name,row,false);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
});

test('companion query DTO/transport failures never supplement the single game request',async()=>{
 for(const [op,name] of Object.entries(names))for(const transport of [true,false]){
  state.transport=transport;state.result={success:true,branch:'business',data:{}};const row=rows.find(r=>r.op===op&&r.result.branch==='business');
  await render(name,row,true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);
 }state.transport=false;
});
