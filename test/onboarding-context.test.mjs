import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__onboardingUX={};
const bundle=await build({entryPoints:['src/response/onboarding/context.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'context-seams',setup(b){
 b.onResolve({filter:/^alemonjs$|^@src\/api\/bot\/robot-business$|^@src\/utils\/(messageHelper|privateEvent|useMessage)$|^\.\.\/middlewareReply$/},a=>({path:a.path,namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 const state=globalThis.__onboardingUX;
 const md=()=>({addText(){return this},addNewline(){return this},addBlockquote(){return this}});
 export const Format={createMarkdown:md,create:md};
 export const ResultCode={Ok:2000};
 export const logger={warn:()=>{}};
 export const createContext=config=>{state.config=config;return{listen:view=>state.listens.push(view),cancel:()=>state.cancel++}};
 export const configureContext=config=>config;
 export const requestRobotBusiness=async(event,op,args)=>{state.calls.push({op,args});if(state.error)throw new Error('temporary failure');return{success:true,branch:'business',middleware:{replies:[]},data:structuredClone(state.reply)}};
 export const FormatGui=p=>p;
 export const createQuoteMarkdown=lines=>lines;
 export const isPrivateEvent=e=>e.name.startsWith('private.');
 export const useMessage=()=>[{send:async value=>{state.sent.push(value);return[{code:2000,message:'OK',data:{}}]}}];
 export const sendMiddlewareReply=async()=>{};
 `}));
}}]});
await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const handler=state.config.handlers.listen;
const view={status:'active',phase:'explore',version:7,title:'宋玉',lines:[],feedback:[],actions:[{label:'挑战关卡',command:'/主线挑战 1-1'}]};
async function run(text,{status='active',name='message.create',error=false}={}){
 Object.assign(state,{calls:[],sent:[],listens:[],cancel:0,reply:structuredClone(view),error});
 const result={pass:0,close:0};
 await handler({name,MessageText:text,UserId:'test',Platform:'qq'},{view:{...structuredClone(view),status}},{pass:()=>result.pass++,close:()=>result.close++});
 return result;
}
test('help passes to the normal router without a request, closure or progression',async()=>{
 for(const text of ['/帮助','/攻略','/我的天赋']){
  const action=await run(text);
  assert.equal(action.pass,1);assert.equal(action.close,0);assert.equal(state.calls.length,0);assert.equal(state.sent.length,0);
 }
});
test('ordinary group conversation passes, prefixed unknown action stays controlled',async()=>{
 assert.equal((await run('今天吃什么')).pass,1);assert.equal(state.calls.length,0);
 assert.equal((await run('/突破')).pass,0);
 assert.deepEqual(state.calls,[{op:'onboarding.view',args:{}}]);
 assert.deepEqual(state.sent[0].footer.flat().map(b=>b.command),['/主线挑战 1-1','/退出引导']);
});
test('a listed real command executes once with the current server version',async()=>{
 const action=await run('/主线挑战 1-1');
 assert.equal(action.pass,0);
 assert.deepEqual(state.calls,[{op:'onboarding.action',args:{version:7,command:'/主线挑战 1-1'}}]);
 assert.equal(state.listens.length,1);
});
test('soft guidance yields other commands and resume/exit reach their exact routes',async()=>{
 const free=await run('/商店',{status:'soft'});
 assert.equal(free.close,1);assert.equal(free.pass,1);assert.equal(state.calls.length,0);
 for(const text of ['/继续引导','/退出引导']){const a=await run(text);assert.equal(a.pass,1);assert.equal(state.calls.length,0)}
});
test('an uncertain action offers recovery without retrying the write',async()=>{
 await run('/主线挑战 1-1',{error:true});
 assert.equal(state.calls.length,1);
 assert.equal(state.sent[0].title,'宋玉 · 操作暂未确认');
 assert.deepEqual(state.sent[0].footer.flat().map(b=>b.command),['/继续引导','/退出引导']);
});
