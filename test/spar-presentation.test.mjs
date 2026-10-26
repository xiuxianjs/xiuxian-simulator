import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__pvp={sent:[],calls:0};
const framework = createPresentationHarness(state, { mentions: [] });
const files={spar:'spar/res'};
const decoders={spar:'parseRobotSpar'};
const bundle=await build({stdin:{contents:Object.entries(files).map(([n,p])=>`export {default as ${n}} from './src/response/${p}.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export {parseRobotSpar} from './src/api/bot/spar.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'pvp',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/(?:useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|api\/bot(?:\/context)?)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/spar\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>globalThis.__pvp.app;`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const writeContext=()=>({});export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const createBackendRequestContext=()=>({});
 export const withBackendRepeatDetection=async(bid,uid,command,text)=>{if(!globalThis.__pvp.old)throw new Error('unexpected repeat API');return text};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__pvp;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSpar','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_SPAR_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({args:JSON.parse(m[1]),text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=22);
async function render(name,text,isPrivate){state.sent=[];state.calls=0;state.next=0;state.old=name==='old_spar';const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate};if(state.argsInput?.targetBid)e.MessageMentions=[{UserId:state.argsInput.targetBid,UserKey:state.argsInput.targetBid,IsMaster:false,IsBot:false}];await framework.run(h[name], e, ()=>{state.next++});return state.sent;}
function original(row){if(row.result.success)return{code:'OK',data:h.parseRobotSpar(row.result.data)};const reply=row.result.middleware.replies.at(-1);const message=reply.text;if(reply.title==='比试')return{code:'REALM_LOCKED',data:{message:'',realmName:message.split('当前境界：')[1]}};if(message.startsWith('元力不足'))return{code:'QI_NOT_ENOUGH',data:{message,qiPillCount:reply.buttons.length?3:0}};if(message==='对方还未踏入仙途')return{code:'TARGET_NOT_FOUND',data:{message}};if(message.startsWith('请提供'))return{code:'NEED_TARGET',data:{message}};if(message.startsWith('不能与自己'))return{code:'SELF_TARGET',data:{message}};if(message.startsWith('今日比试次数'))return{code:'DAILY_LIMIT',data:{message}};return{code:'LOAD_FAILED',data:{message:message.replace(/^比试失败：/,'')}};}
test('spar actual Go win/loss, original refusals, repeat suffixes, pill and realm buttons preserve private/group bubbles',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [true,false]){state.result=row.result;state.argsInput=row.args;state.app=original(row);const actual=await render('spar',row.text,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.op,'pvp.spar');assert.deepEqual(state.args,row.args,row.text);assert.equal(actual.length,row.result.success?2:1);assert.deepEqual(actual,await render('old_spar',row.text,isPrivate),row.text);}
});
test('spar admission delegates every target form; transport/malformed DTOs do not retry, call repeat API or next',async()=>{
 const muted=rows.find(r=>r.result.branch==='middleware').result;
 for(const [text,args] of [['/比试',{targetUid:'0',targetBid:null}],['/比试 0002',{targetUid:'2',targetBid:null}],['/比试 0',{targetUid:'0',targetBid:null}],['/比试 '+'1'+'0'.repeat(400),{targetUid:null,targetBid:null}]]){state.result=muted;state.argsInput=args;await render('spar',text,true);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.deepEqual(state.args,args);}
 for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render('spar','/比试 2',true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);}state.transport=false;
});
