import { goTestFixture } from './helpers/go-fixture.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { withoutExpectedAdvice, replaceExpectedText } from './helpers/recovery-delta.mjs';
import { inventoryAdvice } from './helpers/skill-inventory-recovery-delta.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__learnedBooks={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as learned} from './src/response/skillBook/mySkillBooks/res.ts';export {default as hidden} from './src/response/skillBook/hidden/res.ts';export {default as old_learned} from 'old-learned';export {default as old_hidden} from 'old-hidden';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'batch-learn',setup(b){
 b.onResolve({filter:/^old-(learned|hidden)$/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 // The original list gains only the new sort menu; all slot, item and action assertions remain exact.
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>{
  let contents=readFileSync(new URL('./fixtures/skill-'+a.path+'-before-v2.ts.txt',import.meta.url),'utf8');
  if(a.path==='learned'){
   contents="import { createLearnedBookSortRows } from './src/utils/learnedBookSort';\n"+contents;
   contents=contents.replace("      footer: [\n        ...(result.data.canUseFifthLayerFeature", "      footer: [...createLearnedBookSortRows(), [\n        ...(result.data.canUseFifthLayerFeature");
   contents=contents.replace("      ],\n      nav: { current: currentPage + 1", "      ]],\n      nav: { current: currentPage + 1");
  }
  return {loader:'ts',contents,resolveDir:process.cwd()};
 });
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export const requestBackend=async()=>{const s=globalThis.__learnedBooks;if(!s.kind.startsWith('old_'))throw new Error('supplementary API');s.legacyCalls++;if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__learnedBooks;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessLearnedBooks','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
const rows=[...output.matchAll(/ROBOT_LEARNED_BOOKS=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,254);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('learned and hidden list pages retain original slot, pagination, buttons and refusal bubbles in group/private',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const name=row.op==='skill-books.learned'?'learned':'hidden';
  const actual=await run(name,row,isPrivate);assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:row.op,args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const data=row.result.success?row.result.data:null;
  const empty=data&&data.page.total===0;
  const bounds=data&&data.page.total>0&&data.page.items.length===0&&(name==='hidden'||data.displayPage!==1);
  const reason=!data?row.result.middleware.replies.at(-1).text:empty?(name==='hidden'?'暂无隐藏功法':'可见列表为空'):bounds?'页码超出范围':'';
  let comparable=withoutExpectedAdvice(actual,reason?inventoryAdvice(name,reason):[]);
  if(empty&&name==='learned'&&data.page.inUseBooks.length){
   const addition='💡当前可见列表为空，可核对装备槽位与隐藏列表';
   assert.ok(bubbleSemantics(comparable).text.includes(addition));assert.ok(!bubbleSemantics(comparable).text.includes('暂无已学习的功法'));
   comparable=replaceExpectedText(comparable,addition,'💡暂无已学习的功法');
  }
  const expected=await run('old_'+name,row,isPrivate);
  if(data)assert.deepEqual(comparable,expected,row.state+' '+row.text);
  else {
   const before=bubbleSemantics(expected);
   if(name==='learned'){
    for(const command of ['/一键学习功法','/储物袋 功法'])assert.ok(before.commands.includes(command));
    before.commands=before.commands.filter(command=>!['/一键学习功法','/储物袋 功法'].includes(command));
   }
   assert.deepEqual(bubbleSemantics(comparable),before,row.state+' '+row.text);
  }
 }
});
test('learned lists advance middleware once and fail transport or malformed replies without supplementary API',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run(row.op==='skill-books.learned'?'learned':'hidden',row,false);assert.equal(state.calls.length,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
 for(const name of ['learned','hidden'])for(const transport of [false,true]){state.transport=transport;await run(name,{text:name==='learned'?'/我的功法':'/我的隐藏功法',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);}state.transport=false;
});
