import { withoutExpectedAdvice, replaceExpectedText } from './helpers/recovery-delta.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__skillReset={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/skillBook/reset/res.ts';export {default as original} from 'old-reset';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'batch-learn',setup(b){
 b.onResolve({filter:/^old-reset$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/skill-reset-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export const requestBackend=async()=>{const s=globalThis.__skillReset;if(s.kind!=='original')throw new Error('supplementary API');s.legacyCalls++;if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__skillReset;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSkillReset','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
const rows=[...output.matchAll(/ROBOT_SKILL_RESET=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,172);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('skill reset preview, confirmation, cancellation and refunds retain original group/private bubbles',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'skill-books.reset',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const expected=bubbleSemantics(await run('original',row,isPrivate));
  if(row.status>=400&&row.status<500){
   const generic=row.arguments.mode==='cancel'?'取消功法重制失败，请稍后再试':row.arguments.mode==='confirm'?'确认功法重制失败，请稍后再试':'功法重制失败，请稍后再试';
   assert.ok(expected.text.includes(generic));
   assert.equal(row.result.middleware.replies.at(-1).text,'❌ '+row.v1.error.message);
   expected.text=expected.text.replace(generic,row.v1.error.message);
  }
  let reviewed = actual;
  if (!row.result.success) {
   const text = row.result.middleware.replies.at(-1).text;
   const tips = /你有一份功法重制结果待确认/.test(text)
    ? [{command:'/我的功法',text:'先核对上一条重制预览'}, {command:'/确认重制功法',text:'仅在确认原预览内容'}, {command:'/取消重制功法',text:'只删除待确认预览'}]
    : /使用中的功法不能重制/.test(text) ? [{command:'/我的功法',text:'不会自动换下功法'}]
    : /当前没有待(?:确认|取消)的功法重制结果|重制结果已作废/.test(text) ? [{command:'/我的功法',text:'不反复确认旧预览'}]
    : /没有可重制的词条或等级/.test(text) ? [{command:'/我的功法',text:'无需为重制先消耗资源升级'}]
    : /参数错误|找不到ID为.+的已学功法/.test(text) ? [{command:'/我的功法',text:'模板编号和未学习秘籍'}]
    : [{command:'/我的功法',text:'不自动重放'}, {command:'/我的信息',text:'不把预览中的返还当作已到账'}, {command:'/储物袋 材料 经验材料',text:'尾差会舍弃'}];
   reviewed = withoutExpectedAdvice(actual, tips);
  } else if (row.arguments.mode === 'preview') {
   assert.ok(bubbleSemantics(actual).text.includes('预览有效期为60秒；确认后才执行重制，取消只放弃本次预览。'));
   reviewed = replaceExpectedText(actual, '预览有效期为60秒；确认后才执行重制，取消只放弃本次预览。', '');
  }
  assert.deepEqual(bubbleSemantics(reviewed),expected,row.state+' '+row.text);
 }
});
test('middleware invokes parent next; transport and malformed receipts end with original error and no extra API',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row,false);assert.equal(state.calls.length,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/重制功法 2',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('功法重制结果未获完整确认'));}state.transport=false;
});
