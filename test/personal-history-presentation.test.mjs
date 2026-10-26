import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__personalHistoryPresentation={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as story} from './src/response/story/res.ts';export {default as memory} from './src/response/memory/res.ts';export {default as oldStory} from 'old-story';export {default as oldMemory} from 'old-memory';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'history-presentation',setup(b){
 b.onResolve({filter:/^old-(story|memory)$/},a=>({path:a.path,namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/personal-history-${a.path.slice(4)}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness|response-apps\/(story|memory)\/app)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export default async()=>globalThis.__personalHistoryPresentation.legacy;export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__personalHistoryPresentation;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};`}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessPersonalHistory','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const receipts=[...output.matchAll(/ROBOT_PERSONAL_HISTORY_RESPONSE=([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
const flatten=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?flatten(n.value):[n]);
const textOf=nodes=>flatten(nodes).map(n=>String(n.value??'')).join('');
const commands=nodes=>flatten(nodes).filter(n=>['MD.button','Button'].includes(n.type)).map(n=>n.options.data);
async function render(name){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:name.toLowerCase().includes('story')?'/我的故事':'/我的回忆',isPrivate:true};await framework.run(handlers[name], e, ()=>{state.next++});return state.sent;}
test('personal history keeps original story prose, memory first-event text and conditional navigation',async()=>{
 for(const row of receipts.filter(r=>r.result.success&&r.result.branch==='business')){
  const story=row.op.endsWith('story'),name=story?'story':'memory';state.result=row.result;state.legacy={code:'OK',data:row.result.data};const actual=await render(name);
  assert.equal(state.calls,1);assert.equal(state.op,row.op);assert.deepEqual(state.args,{});assert.equal(state.next,0);assert.equal(actual.length,1);assert.deepEqual(actual,await render(story?'oldStory':'oldMemory'));
  const text=textOf(actual[0]);for(const item of row.result.data.items){assert.ok(text.includes(item.label));for(const key of story?['value','flavor']:['text','subtext'])if(item[key])assert.ok(text.includes(item[key]));}
  assert.equal(commands(actual[0]).includes(story?'/我的回忆':'/我的故事'),row.result.data[story?'canShowMemoryButton':'canShowStoryButton']);
 }
});
test('personal history read failures keep the original titled feedback and never next',async()=>{
 for(const row of receipts.filter(r=>!r.result.success)){
  const story=row.op.endsWith('story');state.result=row.result;state.legacy={code:'LOAD_FAILED'};const actual=await render(story?'story':'memory');assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(actual.length,1);assert.deepEqual(actual,await render(story?'oldStory':'oldMemory'));
 }
});
test('personal history transport and invalid DTO finish with the original failure bubble and one request',async()=>{
 for(const name of ['story','memory'])for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};const sent=await render(name);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(sent.length,1);assert.ok(textOf(sent[0]).includes(`${name==='story'?'故事':'回忆'}加载失败，请稍后再试`));}state.transport=false;
});
test('personal history backend middleware delegates once without sending a business bubble',async()=>{
 for(const row of receipts.filter(r=>r.result.branch==='middleware')){state.result=row.result;await render(row.op.endsWith('story')?'story':'memory');assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
});
