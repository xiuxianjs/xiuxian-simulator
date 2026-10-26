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

const state=globalThis.__skillProficiency={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/skillBook/proficiency/res.ts';export {default as original} from 'old-proficiency';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'batch-learn',setup(b){
 b.onResolve({filter:/^old-proficiency$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/skill-proficiency-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export const requestBackend=async()=>{const s=globalThis.__skillProficiency;if(s.kind!=='original')throw new Error('supplementary API');s.legacyCalls++;if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__skillProficiency;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSkillProficiency','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
const rows=[...output.matchAll(/ROBOT_SKILL_PROFICIENCY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,224);
const rejected=row=>{const tokens=row.arguments.tokens,last=tokens.at(-1);return tokens.length>=2&&last!=='全部'&&last!=='所有'&&(!/^\d+$/.test(last)||!Number.isSafeInteger(Number(last))||Number(last)<1);};
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('proficiency integer/all spending, corrected pity and recovery preserve original group/private facts',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);if(rejected(row)){assert.equal(state.calls.length,0);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);const view=bubbleSemantics(actual);assert.ok(view.text.includes('完整正整数'));assert.ok(!view.commands.some(command=>/^\/参悟\s/.test(command)));continue;}assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'skill-books.proficiency',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const data=row.result.success?row.result.data:null;
  const full=data?.newProficiency>=100,empty=data&&(data.remainingPoints??0)===0;
  const text=full?'该功法熟练度已达圆满':empty?'当前熟练点不足':row.result.middleware.replies.at(-1)?.text??'';
  let comparable=withoutExpectedAdvice(actual,full||empty||!row.result.success?inventoryAdvice('proficiency',text):[]);
  if(data?.pityTriggered){assert.ok(bubbleSemantics(comparable).text.includes('本次触发过保底成功'));assert.ok(!bubbleSemantics(comparable).text.includes('下次必成功'));comparable=replaceExpectedText(comparable,'🎯 本次触发过保底成功','🎯 触发保底，下次必成功');}
  const expected=await run('original',row,isPrivate);
  if(full){
   const identifier=row.arguments.tokens.slice(0,-1).join(' ');const before=bubbleSemantics(expected),after=bubbleSemantics(comparable);
   if((data.remainingPoints??0)>0){assert.ok(before.commands.includes(`/参悟 ${identifier} 1`));assert.ok(before.commands.includes(`/参悟 ${identifier} 全部`));}
   before.commands=before.commands.filter(command=>!/^\/参悟\s/.test(command));assert.ok(!after.commands.some(command=>/^\/参悟\s/.test(command)));assert.deepEqual(after,before,row.state+' '+row.text);
  }else if(data)assert.deepEqual(comparable,expected,row.state+' '+row.text);
  else {
   const before=bubbleSemantics(expected);
   if(/熟练点不足/.test(text)){
    const replaced=' 💡 熟练点可通过比试胜利获取，也可服用明悟丹提升熟练度';
    assert.ok(before.text.endsWith(replaced),before.text);before.text=before.text.slice(0,-replaced.length);
   }
   assert.deepEqual(bubbleSemantics(comparable),before,row.state+' '+row.text);
  }
 }
});
test('middleware invokes parent next; transport and malformed receipts end with original error and no extra API',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){await run('current',row,false);if(rejected(row)){assert.equal(state.calls.length,0);assert.equal(state.next,0);assert.ok(bubbleSemantics(state.sent).text.includes('完整正整数'));}else{assert.equal(state.calls.length,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}}
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/参悟 2 1',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('参悟结果未获完整确认，请先核对当前熟练度、熟练点与原回执。'));}state.transport=false;
});
