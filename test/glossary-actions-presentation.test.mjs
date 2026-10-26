import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__glossaryActionsPresentation={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as apply} from './src/response/glossary/apply/res.ts';export {default as upsert} from './src/response/glossary/create/res.ts';export {default as deleteEntry} from './src/response/glossary/delete/res.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'glossary-actions-presentation',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__glossaryActionsPresentation;s.calls++;s.args=args;s.op=op;if(s.transport)throw new Error('transport');if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};`}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGlossaryActions','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GLOSSARY_ACTION_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));
const flatten=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?flatten(n.value):[n]);
const textOf=nodes=>flatten(nodes).map(n=>String(n.value??'')).join('');
const commands=nodes=>flatten(nodes).filter(n=>['MD.button','Button'].includes(n.type)).map(n=>n.options.data);
async function render(row){
 const {reason,mode,keyword,content}=row.args,name=row.op==='glossary.apply'?'apply':row.op==='glossary.delete'?'deleteEntry':'upsert';
 const text=name==='apply'?`/申请词典编辑权限 ${reason}`:name==='deleteEntry'?`/删除词典 ${keyword}`:mode==='help'?'/录入词典':`/录入词典 ${keyword}${mode==='write'?' '+content:''}`;
 state.result=row.result;state.sent=[];state.calls=0;
 const e={name:'message.create',UserId:'player',MessageText:text,isPrivate:true};
 await framework.run(handlers[name], e, ()=>{throw new Error('unexpected next')});
 assert.equal(state.calls,1);assert.equal(state.sent.length,1);assert.equal(state.op,row.op);assert.deepEqual(state.args,row.args);return state.sent[0];
}
test('glossary application keeps submitted reason, limit and original footer',async()=>{
 for(const row of receipts.filter(r=>r.op==='glossary.apply'&&r.result.success)){
  const nodes=await render(row),text=textOf(nodes);assert.ok(text.includes('✅ 词典编辑权限申请已提交'));assert.ok(text.includes(`申请理由：${row.args.reason}`));assert.ok(text.includes('最多100字'));assert.ok(commands(nodes).includes('/词典'));assert.ok(commands(nodes).includes('/录入词典'));
 }
});
test('glossary help and create/update keep policy, category, usage and original navigation',async()=>{
 for(const row of receipts.filter(r=>r.op==='glossary.upsert'&&r.result.success)){
  const nodes=await render(row),text=textOf(nodes),data=row.result.data;
  if(data.mode==='help'){assert.ok(text.includes('格式：/录入词典 词条名 内容'));assert.ok(text.includes(`可用分类：${data.view.policy.categories.join('、')}`));assert.ok(text.includes(`今日已录入：${data.view.quota.used}/${data.view.quota.dailyLimit}`));assert.ok(commands(nodes).includes('/词典分类'));}
  else {assert.ok(text.includes(`✅ 词条「${row.args.keyword}」${data.result.isNew?'创建':'更新'}成功`));assert.ok(text.includes(`分类：${data.result.category}`));assert.ok(text.includes(`今日已录入：${data.result.used}/${data.result.dailyLimit}`));assert.ok(commands(nodes).includes(`/词典 ${row.args.keyword}`));assert.ok(commands(nodes).includes('/录入词典'));}
 }
});
test('glossary deletion keeps success text and original footer',async()=>{
 for(const row of receipts.filter(r=>r.op==='glossary.delete'&&r.result.success)){
  const nodes=await render(row);assert.ok(textOf(nodes).includes(`✅ 词条「${row.args.keyword}」已删除`));assert.ok(commands(nodes).includes('/词典'));assert.ok(commands(nodes).includes('/录入词典'));
 }
});
test('all glossary refusals preserve lines, repeat suffix and scoped footer; partial commits explicitly stop',async()=>{
 const rows=receipts.filter(r=>!r.result.success);assert.ok(rows.some(r=>r.result.middleware.replies.at(-1).text.includes('已完成：entry')));assert.ok(rows.some(r=>r.result.middleware.replies.at(-1).text.includes('日志写入结果未确认')));assert.ok(rows.some(r=>r.result.middleware.replies.at(-1).text.includes('道友，你是来找我玩的吗')));
 for(const row of rows){const reply=row.result.middleware.replies.at(-1),nodes=await render(row),text=textOf(nodes);for(const line of reply.blocks??[{text:reply.text}])assert.ok(text.includes(line.text));for(const b of reply.buttons)assert.ok(commands(nodes).includes(b.command));}
});
test('glossary transport and invalid DTO remain terminal with no additional APIs',async()=>{
 for(const op of ['glossary.apply','glossary.upsert','glossary.delete']){
  const row=receipts.find(r=>r.op===op&&r.result.success);
  for(const transport of [true,false]){state.transport=transport;await assert.rejects(()=>render({...row,result:{success:true,data:{}}}));assert.equal(state.calls,1);assert.equal(state.sent.length,0);}
 }
 state.transport=false;
});
