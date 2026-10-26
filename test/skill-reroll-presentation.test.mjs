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
const state=globalThis.__skillReroll={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/skillBook/reroll/res.ts';export {default as original} from 'old-reroll';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'batch-learn',setup(b){
 b.onResolve({filter:/^old-reroll$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/skill-reroll-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export const requestBackend=async()=>{const s=globalThis.__skillReroll;if(s.kind!=='original')throw new Error('supplementary API');s.legacyCalls++;if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__skillReroll;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSkillReroll','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
const rows=[...output.matchAll(/ROBOT_SKILL_REROLL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,228);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('skill reroll options, zero/active target, confirmation and cancellation preserve original group/private bubbles',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'skill-books.reroll',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const expected=bubbleSemantics(await run('original',row,isPrivate));
  if(row.status>=400&&row.status<500){
   const generic=row.arguments.mode==='cancel'?'取消功法换词失败，请稍后再试':row.arguments.mode==='confirm'?'确认功法换词失败，请稍后再试':'功法换词失败，请稍后再试';
   assert.ok(expected.text.includes(generic));
   assert.equal(row.result.middleware.replies.at(-1).text,'❌ '+row.v1.error.message);
   expected.text=expected.text.replace(generic,row.v1.error.message);
  }
  let reviewed = actual;
  if (!row.result.success) {
   const text = row.result.middleware.replies.at(-1).text;
   const single = /换词符不足/.test(text) ? [{command:'/储物袋',text:'换词符'}]
    : /无法识别词条|没有激活词条|没有可替换|换词结果|找不到ID为|参数错误|确认需要原数字编号/.test(text) ? [{command:'/我的功法',text:'核对'}]
    : [{command:'/我的功法',text:'核对'}, {command:'/储物袋',text:'换词符'}];
   reviewed = withoutExpectedAdvice(actual, single);
  } else if (row.arguments.mode === 'preview') {
   const result = row.result.data.result;
   if (result.mode === 'list') {
    reviewed = withoutExpectedAdvice(actual, !result.availableAttrs.length ? [{command:'/我的功法',text:'激活词条'}] : !result.ownedCount ? [{command:'/储物袋',text:'换词符'}] : []);
    const explanation = '查看列表不消耗；选择词条生成预览会消耗换词符×1，取消不返还。';
    assert.ok(bubbleSemantics(actual).text.includes(explanation));
    reviewed = replaceExpectedText(reviewed, explanation, '');
    if (!result.availableAttrs.length) {
     assert.ok(bubbleSemantics(actual).text.includes('当前没有可选择的词条，请核对当前已学功法与激活词条。'));
     reviewed = replaceExpectedText(reviewed, '当前没有可选择的词条，请核对当前已学功法与激活词条。', '');
    }
   } else {
    const explanation = '预览有效期60秒；按原预览编号确认，过期后先核对状态，不自动重新选词。';
    assert.ok(bubbleSemantics(actual).text.includes(explanation));
    reviewed = replaceExpectedText(actual, explanation, '');
   }
  } else if (row.arguments.mode === 'confirm' && Number(row.arguments.bookId) === 0) {
   assert.ok(expected.commands.includes('/查看功法 0'));
   const id = row.result.data.pending.userSkillBookId;
   assert.ok(id > 0);
   assert.ok(bubbleSemantics(actual).commands.includes('/查看功法 '+id));
   expected.commands = expected.commands.map(command => command === '/查看功法 0' ? '/查看功法 '+id : command).sort();
  }
  if (row.result.success && row.arguments.mode === 'preview' && row.result.data.result.mode === 'list') {
   assert.ok(bubbleSemantics(reviewed).text.includes('优先从未激活词条池抽取；没有可用未激活词条时才使用已激活词条池。'));
   reviewed = replaceExpectedText(reviewed, '优先从未激活词条池抽取；没有可用未激活词条时才使用已激活词条池。', '目标词条优先从当前为0的词条中抽取，已激活词条概率较低');
  }
  assert.deepEqual(bubbleSemantics(reviewed),expected,row.state+' '+row.text);
 }
});
test('middleware invokes parent next; transport and malformed receipts end with original error and no extra API',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row,false);assert.equal(state.calls.length,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/换词 2',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('功法换词结果未获完整确认'));}state.transport=false;
});
