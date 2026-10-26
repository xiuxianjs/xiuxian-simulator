import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__companionActions={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:['accept','reject','breakup'].map(n=>`export {default as ${n}} from './src/response/companion/${n}/res.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export * from './src/api/bot/companion-actions-robot.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'companionActions',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/companion-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/response\/access\/fifthLayer$/},a=>({path:a.path,namespace:'access'}));
 b.onLoad({filter:/.*/,namespace:'access'},()=>({contents:`export {sendFifthLayerLockedPage} from './src/response/access/fifthLayerView.ts';export const canAccessFifthLayerFeature=async()=>globalThis.__companionActions.access;`,resolveDir:process.cwd()}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/companion\/(accept|reject|breakup)\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>globalThis.__companionActions.app;export const checkBreakup=async()=>globalThis.__companionActions.app;export const confirmBreakup=async()=>{throw new Error('unexpected extra confirmation API')};`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const withBackendRepeatDetection=async(bid,uid,command,text)=>text;export const createBackendRequestContext=()=>({});
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected supplementary game API')};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__companionActions;s.calls++;s.op=op;s.args=args;if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessCompanionActions','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_COMPANION_ACTION_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=35);
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(h[name], e, ()=>state.next++);return state.sent;}
function original(row){state.access={ok:true,realmName:'炼气'};
 if(row.result.success){const data=row.result.data;if(row.op==='companion.breakup')return{code:'CONFIRM_NEEDED',data:{partnerName:data.partnerName??'道友',access:state.access,...(data.mode==='result'?{settledResult:{code:'OK',data:{message:data.message,narrativeText:data.narrativeText}}}:{})}};
  if(data.mode==='list')return{code:'LIST',data:{received:h.parseRobotCompanionProposalAction(data).received}};
  return{code:'OK',data:{message:data.message}};
 }
 const reply=row.result.middleware.replies.at(-1);
 if(reply.buttons[0]?.command==='/我的境界'){state.access={ok:false,realmName:reply.text.split('：').at(-1)};return row.op==='companion.breakup'?{code:'NO_COMPANION',data:{access:state.access,message:'你当前没有道侣'}}:null;}
 if(row.op==='companion.breakup')return reply.text==='你当前没有道侣'?{code:'NO_COMPANION',data:{access:state.access,message:reply.text}}:{code:'CONFIRM_NEEDED',data:{partnerName:'道友',access:state.access,settledResult:{code:'FAIL',data:{message:reply.text}}}};
 return{code:'FAIL',data:{message:reply.text}};
}
test('companion accept/reject/breakup retain original private/group list, confirmation, narrative and repeated feedback',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [true,false]){
  const name=row.op.split('.').at(-1);state.result=row.result;state.app=original(row);const actual=await render(name,row,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.op,row.op);assert.deepEqual(state.args,row.args,row.text);assert.equal(actual.length,1);assert.deepEqual(bubbleSemantics(actual),bubbleSemantics(await render('old_'+name,row,isPrivate)),row.text);
 }
});
test('companion relationship commands delegate only middleware to parent and never supplement requests',async()=>{
 const result=rows.find(r=>r.result.branch==='middleware').result;
 for(const name of ['accept','reject','breakup']){const row=rows.find(r=>r.op==='companion.'+name&&r.result.branch==='business');state.result=result;await render(name,row,false);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
});
