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
const state=globalThis.__storylineChallenge={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state, { persistent: true });
const exports="export {default as current} from './src/response/storyline/challenge/res.ts';export {default as old} from 'old-storyline-challenge';";
const bundle=await build({stdin:{contents:exports,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'storyline-challenge',setup(b){
 b.onResolve({filter:/^old-(storyline-challenge)$/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL('./fixtures/'+a.path+'-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:resolve('src/response/storyline/challenge')}));
 b.onResolve({filter:/^@alemonjs\/qq-bot$/},()=>({path:import.meta.resolve('@alemonjs/qq-bot'),external:true}));
    b.onResolve({filter:/^alemonjs$/},()=>({path:'framework',namespace:'framework'}));
 b.onResolve({filter:/^file:/},a=>({path:a.path,external:true}));
 b.onLoad({filter:/.*/,namespace:'framework'},()=>({contents:`export * from ${JSON.stringify(pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href)}; export const useSubscribe=()=>[{mount:(...args)=>{globalThis.__storylineChallenge.subscriptions.push(args);return 'subscription'},cancel:()=>{}}];`}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|api\/bot\/robot-business)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const writeContext=request=>{if(!request?.idempotencyKey)throw new Error('missing identity');return request};
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__storylineChallenge;if(!s.kind.startsWith('old'))throw new Error('supplementary API');s.legacyCalls++;s.query={operation,args};const reading=operation==='get_players_id_storyline_manual_battles_sessionId';const status=reading?s.row.readStatus:s.row.status;if(status!==200)throw new Error(s.row.message??s.row.expected);return (reading?s.row.read:s.row.v1).data};
 export { useMessage } from 'alemonjs';
 export const isRobotPublicEntry=()=>false;export const requestRobotBusiness=async(e,op,args,decode)=>{const s=globalThis.__storylineChallenge;s.calls.push({op,args});const r=s.row.result;if(s.readGate)await s.readGate;if(s.transport)throw new Error('transport');return r.success&&r.branch==='business'?{...r,data:decode(r.data,1)}:r};
 export const finishRobotBusiness=async(e,r,next,feedback,trackCommand)=>{const s=globalThis.__storylineChallenge;s.finishes??=[];s.finishes.push({e,r,trackCommand});if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:r.data}};
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__storylineChallenge;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessStorylineChallenge','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_STORYLINE_CHALLENGE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,144);
function canonical(value,row){let encoded=JSON.stringify(value);for(const data of [row.result.data,row.v1?.data,row.expected,row.initial,row.oldInitial])if(data?.sessionId)encoded=encoded.split(data.sessionId).join('session');return JSON.parse(encoded);}
// The only intended settlement delta is two actionable cultivation tips on a
// loss. Assert those tips exactly, then retain the full legacy bubble assertion.
function withoutRecoveryAdvice(messages){
 const copy=structuredClone(messages);
 for(const nodes of copy)for(const node of nodes){
  if(node.type!=='Markdown')continue;
  const lost=JSON.stringify(node.value).includes('结果：失败');
  const start=node.value.findIndex(child=>child.type==='MD.text'&&child.value==='建议：');
  if(!lost){assert.equal(start,-1);continue;}
  assert.ok(start>0,'loss must include next actions');
  assert.equal(node.value[start-1].type,'MD.newline');
  const wanted=[
   {command:'/我的功法',text:'调整已装备功法：先查看功法搭配与培养状态，再决定是否重新挑战；已有战斗消耗与结果保留'},
   {command:'/我的境界',text:'核对境界提升条件：查看当前修为和突破材料，满足提升条件后再安排挑战'}
  ];
  for(const [index,tip]of wanted.entries()){
   assert.equal(node.value[start+1+index*2].type,'MD.newline');
   const quote=node.value[start+2+index*2];assert.equal(quote.type,'MD.blockquote');
   assert.equal(quote.value[0].value,tip.text);
   assert.deepEqual(quote.value.filter(child=>child.type==='MD.button').map(child=>child.options.data),[tip.command]);
  }
  node.value.splice(start-1,6);
 }
 return copy;
}
async function run(kind,row,isPrivate){
 await framework.dispose();
 Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0,subscriptions:[],timers:[]});
 const e={name:'message.create',UserId:'player',uid:1,MessageId:'challenge',MessageText:row.text,isPrivate};
 const originalTimeout=globalThis.setTimeout;
 globalThis.setTimeout=(callback,delay)=>{if(delay===5000)return originalTimeout(callback,delay);state.timers.push({callback,delay});return 1};
 try{await framework.run(handlers[kind], e, ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));}
 finally{globalThis.setTimeout=originalTimeout;}
 return canonical(state.sent,row);
}
test('storyline challenge preserves original choice, settlement and refusal bubbles',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'storyline.challenge',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const timers=state.timers.filter(t=>t.delay===31000).map(t=>t.delay),subscriptions=state.subscriptions.length;
  assert.deepEqual(withoutRecoveryAdvice(actual),await run('old',row,isPrivate),row.state+' '+row.text);
  assert.deepEqual(timers,state.timers.filter(t=>t.delay===31000).map(t=>t.delay));assert.equal(subscriptions,state.subscriptions.length);
  if(subscriptions)assert.deepEqual(timers,[31000]);
  assert.equal(state.legacyCalls,row.valid?1:0);
  if(row.valid){assert.equal(state.query.operation,'post_players_id_storyline_challenge_command');assert.deepEqual(state.query.args.body,{chapterNumber:row.chapter,stageNumber:row.stage});}
 }
});
test('storyline challenge middleware calls parent next; malformed DTO and transport error end',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){
  await run('current',row,false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls.length,1);
 }
 for(const transport of [false,true])for(const row of rows.filter(r=>r.state==='auto'&&r.text==='/主线挑战 1-1')){
  state.transport=transport;await run('current',{...row,result:{success:true,branch:'business',data:{}}},false);
  assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);
 }state.transport=false;
});

const choiceOutput=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessStorylineChoice','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const choiceRows=[...choiceOutput.matchAll(/ROBOT_STORYLINE_CHOICE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(choiceRows.length,63);
async function runChoice(kind,row,isPrivate){
 const initial=kind==='old'?row.oldInitial:row.initial;
 await run(kind,{text:'/主线挑战 1-1',status:200,v1:{data:initial},result:{success:true,branch:'business',data:initial}},isPrivate);
 const callback=state.subscriptions.at(-1)[0];
 Object.assign(state,{row,calls:[],sent:[],legacyCalls:0,next:0,transport:row.transport??false});
 const e={name:'message.create',UserId:'player',MessageId:'choice-message',MessageText:row.text,isPrivate};
 const nextArgs=[];
 const originalTimeout=globalThis.setTimeout;globalThis.setTimeout=(callback,delay)=>{if(delay===5000)return originalTimeout(callback,delay);state.timers.push({callback,delay});return 1};
 try{await framework.invoke(e, ()=>callback(e), (...args)=>{state.next++;nextArgs.push(args)});await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));}
 finally{globalThis.setTimeout=originalTimeout;state.transport=false;}
 return {sent:canonical(state.sent,row),event:e,nextArgs};
}
test('manual choice preserves original recovered state and settlement bubbles with one combined request',async()=>{
 for(const row of choiceRows.filter(r=>r.initial&&r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await runChoice('current',row,isPrivate);
  assert.deepEqual(state.calls,[{op:'storyline.choice',args:row.arguments}]);assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  assert.deepEqual(withoutRecoveryAdvice(actual.sent),(await runChoice('old',row,isPrivate)).sent,row.state+' '+row.text);
  assert.equal(state.legacyCalls,row.status===200?1:2);
 }
});
test('manual choice attaches original event only on middleware and uses subscribe hook next(true,true)',async()=>{
 for(const row of choiceRows.filter(r=>r.state==='muted')){
  const {event,nextArgs}=await runChoice('current',row,false);
  assert.equal(event.__res,row.result);assert.deepEqual(nextArgs,[[true,true]]);assert.equal(state.calls.length,1);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,0);
 }
 const row=choiceRows.find(r=>r.state==='pending'&&r.choice==='normal');
 for(const transport of [false,true]){
  await runChoice('current',{...row,transport,result:{success:true,branch:'business',data:{}}},false);
  assert.equal(state.calls.length,1);assert.equal(state.legacyCalls,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);
 }
});

const stateOutput=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessStorylineState','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const stateRows=[...stateOutput.matchAll(/ROBOT_STORYLINE_STATE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(stateRows.length,9);
async function fireTimer(callback){
 const originalTimeout=globalThis.setTimeout;
 globalThis.setTimeout=(callback,delay)=>{if(delay===5000)return originalTimeout(callback,delay);state.timers.push({callback,delay});return 1};
 try{await framework.invokeLast(async()=>{callback();await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));});}
 finally{globalThis.setTimeout=originalTimeout;}
}
async function runPoll(kind,row,isPrivate){
 const initial={...(kind==='old'?row.oldInitial:row.initial)??choiceRows[0].initial,sessionId:row.arguments.sessionId};
 await run(kind,{text:'/主线挑战 1-1',status:200,v1:{data:initial},result:{success:true,branch:'business',data:initial}},isPrivate);
 const callback=state.timers.find(t=>t.delay===31000).callback;
 Object.assign(state,{row:{...row,readStatus:row.status,read:row.v1,expected:row.message},calls:[],sent:[],legacyCalls:0,next:0,finishes:[],timers:[]});
 await fireTimer(callback);
 return canonical(state.sent,{...row,expected:row.v1?.data});
}
test('scheduled state read preserves pending/expired waits and original settlement bubbles',async()=>{
 for(const row of stateRows.filter(r=>['pending','finished','expired'].includes(r.state)))for(const isPrivate of [false,true]){
  const actual=await runPoll('current',row,isPrivate);
  assert.deepEqual(state.calls,[{op:'storyline.state',args:row.arguments}]);assert.equal(state.legacyCalls,0);assert.equal(state.next,0);assert.equal(state.finishes.length,1);assert.equal(state.finishes[0].trackCommand,false);
  const timers=state.timers.map(t=>t.delay);
  assert.deepEqual(withoutRecoveryAdvice(actual),await runPoll('old',row,isPrivate),row.state);assert.equal(state.legacyCalls,1);assert.deepEqual(timers,state.timers.map(t=>t.delay));
 }
});
test('scheduled controlled refusal ends; middleware attaches the originating event and continues once',async()=>{
 for(const row of stateRows.filter(r=>!['pending','finished','expired'].includes(r.state))){
  const sent=await runPoll('current',row,false);
  assert.equal(state.calls.length,1);assert.equal(state.legacyCalls,0);assert.equal(state.timers.length,0);
  if(row.state==='muted'){assert.equal(sent.length,0);assert.equal(state.next,1);assert.equal(state.finishes[0].e.__res,row.result);}
  else{assert.equal(sent.length,1);assert.equal(state.next,0);}
 }
});
test('in-flight state response cannot overtake a choice; later polling uses the choice event continuation',async()=>{
 const row=stateRows.find(r=>r.state==='pending');
 await run('current',{text:'/主线挑战 1-1',status:200,v1:{data:row.initial},result:{success:true,branch:'business',data:row.initial}},false);
 const timer=state.timers.find(t=>t.delay===31000).callback,callback=state.subscriptions.at(-1)[0];
 let release;state.readGate=new Promise(resolve=>{release=resolve});
 state.row=stateRows.find(r=>r.state==='muted');state.finishes=[];state.calls=[];state.sent=[];
 await fireTimer(timer);assert.equal(state.calls.length,1);assert.equal(state.finishes.length,0);
 const choice=choiceRows.find(r=>r.state==='pending'&&r.choice==='normal');state.row=choice;
 const e={name:'message.create',UserId:'player',MessageId:'new-choice',MessageText:choice.text,isPrivate:false};const nextArgs=[];
 const originalTimeout=globalThis.setTimeout;globalThis.setTimeout=(callback,delay)=>{if(delay===5000)return originalTimeout(callback,delay);state.timers.push({callback,delay});return 1};
 try{await framework.invoke(e, ()=>callback(e), (...args)=>nextArgs.push(args));}finally{globalThis.setTimeout=originalTimeout;}
 release();state.readGate=undefined;await new Promise(resolve=>setImmediate(resolve));
 assert.equal(state.finishes.length,0);assert.equal(state.calls.length,2);assert.deepEqual(nextArgs,[]);assert.equal(e.__res,undefined);
 const newTimer=state.timers.filter(t=>t.delay===31000).at(-1).callback;state.row=stateRows.find(r=>r.state==='muted');state.calls=[];
 await fireTimer(newTimer);
 assert.equal(state.calls.length,1);assert.equal(state.finishes[0].e,e);assert.equal(e.__res,state.row.result);assert.deepEqual(nextArgs,[[true,true]]);
});
