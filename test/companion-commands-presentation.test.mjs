import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__companionCommands={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:['propose','gift'].map(n=>`export {default as ${n}} from './src/response/companion/${n}/res.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export * from './src/api/bot/companion-propose-robot.ts';export {parseCompanionGiftCommand} from './src/api/bot/companion-gift-command.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'companionCommands',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/companion-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/response\/access\/fifthLayer$/},a=>({path:a.path,namespace:'access'}));
 b.onLoad({filter:/.*/,namespace:'access'},()=>({contents:`export {sendFifthLayerLockedPage} from './src/response/access/fifthLayerView.ts';export const canAccessFifthLayerFeature=async()=>globalThis.__companionCommands.access;`,resolveDir:process.cwd()}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/companion\/propose\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export const executeProposalCommand=async()=>globalThis.__companionCommands.command;export const getEligibleFriends=async()=>({code:'OK',data:globalThis.__companionCommands.app});`}));
 b.onResolve({filter:/^@src\/api\/bot\/companion-gift-command$/},a=>({path:a.path,namespace:'gift'}));
 b.onLoad({filter:/.*/,namespace:'gift'},()=>({contents:`export {parseCompanionGiftCommand} from './src/api/bot/companion-gift-command.ts';export const commandBackendCompanionGift=async()=>globalThis.__companionCommands.command;`,resolveDir:process.cwd()}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const withBackendRepeatDetection=async(bid,uid,command,text)=>text;export const createBackendRequestContext=()=>({});
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const writeContext=()=>{throw new Error('unexpected write API')};export const requestBackend=()=>{throw new Error('unexpected supplementary API')};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__companionCommands;s.calls++;s.op=op;s.args=args;if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessCompanionCommands','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
const rows=[...output.matchAll(/ROBOT_COMPANION_COMMAND_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=45);
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate,MessageMentions:row.args.targetBid?[{UserId:row.args.targetBid,UserKey:row.args.targetBid,IsMaster:false,IsBot:false}]:[]};await framework.run(h[name], e, ()=>state.next++);return state.sent;}
function original(row){state.access={ok:true,realmName:'炼气'};
 if(row.result.success){if(row.op==='companion.gift'){state.command=h.parseCompanionGiftCommand(row.result.data);return;}
  const data=h.parseRobotCompanionPropose(row.result.data);
  if(data.mode==='command')state.command=data.command;else{state.app=data.preflight;state.command={code:'NOT_FOUND',preflight:data.preflight};}return;
 }
 const reply=row.result.middleware.replies.at(-1);
 if(reply.buttons[0]?.command==='/我的境界'){state.access={ok:false,realmName:reply.text.split('：').at(-1)};return;}
 if(row.op==='companion.propose'){
  if(reply.quote)state.command={code:'NO_OATH_ITEMS',preflight:{}};
  else if(reply.text.startsWith('未找到「'))state.command={code:'NOT_FOUND',preflight:{}};
  else if(reply.text.startsWith('序号超出范围'))state.command={code:'INDEX_INVALID',preflight:{oathItems:Array(Number(reply.text.split('~').at(-1))).fill({})}};
  else state.command={code:'COMPLETED',preflight:{},mutationError:reply.text};
 }else{
  if(reply.text.startsWith('格式错误'))state.command={mode:'INVALID',targetId:0,giftName:'花'};
  else if(reply.text==='未找到该用户')state.command={mode:'OPTIONS',targetId:Number(row.args.firstParam),options:{targetFound:false}};
  else if(reply.text.startsWith('未找到礼物'))state.command={mode:'TARGETS',targetId:0,targets:{giftExists:false,friends:[]}};
  else state.command={mode:'GIFT',targetId:2,giftName:'花',mutationError:reply.text};
 }
}
test('proposal/gift keep original private/group lists, choice buttons, successful mutations and refused bubbles',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [true,false]){
  const name=row.op.split('.').at(-1);state.result=row.result;original(row);const actual=await render(name,row,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.op,row.op);assert.deepEqual(JSON.parse(JSON.stringify(state.args)),row.args,row.text);assert.equal(actual.length,1);assert.deepEqual(bubbleSemantics(actual),bubbleSemantics(await render('old_'+name,row,isPrivate)),row.text);
 }
});
test('only backend middleware branches delegate to parent without supplementing game HTTP',async()=>{
 const result=rows.find(r=>r.result.branch==='middleware').result;
 for(const name of ['propose','gift']){const row=rows.find(r=>r.op==='companion.'+name&&r.result.branch==='business');state.result=result;await render(name,row,false);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
});
