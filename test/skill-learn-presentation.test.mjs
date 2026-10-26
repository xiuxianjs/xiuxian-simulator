import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { withoutExpectedAdvice, replaceExpectedText } from './helpers/recovery-delta.mjs';
import { inventoryAdvice, rejectsInventoryInput, assertInventoryGuard } from './helpers/skill-inventory-recovery-delta.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__skillLearn={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/skillBook/learn/res.ts';export {default as old} from 'old';export {parseRobotSkillBookLearn} from './src/api/bot/skill-book-learn.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'learn',setup(b){
 b.onResolve({filter:/^old$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/skill-learn-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src$|^@src\/api$|^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/api\/bot\/client$|^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export class BackendAPIError extends Error{constructor(message,code,status){super(message);this.code=code;this.status=status}};
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export const withBackendRepeatDetection=async(bid,uid,command,message)=>{const suffix=globalThis.__skillLearn.row.v1?.presentation?.repeat?.suffix;return suffix?message+'\\n\\n'+suffix:message};
 export const requestBackend=async(bid,op,options)=>{const s=globalThis.__skillLearn;if(s.kind!=='old')throw new Error('supplementary API');if(!Number.isSafeInteger(options.path.skillBookId))throw new Error('Invalid parameter skillBookId');s.legacyCalls++;if(s.row.status!==200)throw new BackendAPIError(s.row.v1.error.message,s.row.v1.error.code,s.row.status);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__skillLearn;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.row.result.branch==='middleware'){next();return{handled:true}}if(!s.row.result.success){await feedback(s.row.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.row.result.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSkillLearn','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
const rows=[...output.matchAll(/ROBOT_SKILL_LEARN=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,153);
async function run(name,row,isPrivate){state.kind=name;state.row=row;state.sent=[];state.calls=0;state.next=0;state.legacyCalls=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[name], e, ()=>state.next++);return state.sent;}
test('learning receipts preserve original group/private bubbles and exact confirmation/refund details',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'&&!r.schemaRefusal))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  if(rejectsInventoryInput('learn',row.arguments)){assert.equal(state.calls,0);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assertInventoryGuard(actual,'learn');continue;}
  assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.deepEqual(state.args,row.arguments);assert.equal(actual.length,1);
  const failed=!row.result.success;
  let comparable=withoutExpectedAdvice(actual,failed?inventoryAdvice('learn',row.result.middleware.replies.at(-1).text):[]);
  const preview=row.result.success&&row.result.data.outcome==='confirmation_required';
  if(preview){
   const added='本次仅为学习替换比较，尚未替换旧功法；确认前核对原对象与返还，不接受时返回我的功法。';
   assert.ok(bubbleSemantics(comparable).text.includes(added));
   comparable=replaceExpectedText(comparable,added,'');
  }
  assert.deepEqual(bubbleSemantics(comparable),bubbleSemantics(await run('old',row,isPrivate),preview?['/我的功法']:[]),row.state+row.text);
 }
 assert.ok(rows.some(r=>JSON.stringify(r.result).includes('道友，你是来找我玩的吗')));
});
test('invalid confirmation stops, mute calls parent next, and transport/DTO errors never supplement',async()=>{
 for(const row of rows){
  if(rejectsInventoryInput('learn',row.arguments)){await run('current',row,false);assert.equal(state.calls,0);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assertInventoryGuard(state.sent,'learn');}
  else if(row.result.branch==='middleware'){await run('current',row,false);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
  else if(row.schemaRefusal){await run('current',row,false);assert.equal(state.calls,1);assert.equal(state.next,0);assert.ok(JSON.stringify(state.sent).includes(row.expectedMessage));}
 }
 for(const transport of [true,false]){state.transport=transport;await run('current',{text:'/学习功法 2',result:{success:true,branch:'business',data:{}}},true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);}state.transport=false;
 for(const outcome of ['empty_bag','not_found','locked','already_learned'])assert.throws(()=>handlers.parseRobotSkillBookLearn({outcome}));
});
