import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__feedbackPresentation={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as compose} from './src/response/feedbacks/feedbackGame/res.ts';export {default as detail} from './src/response/feedbacks/feedbackInfo/res.ts';export {default as mine} from './src/response/feedbacks/feedbacksMe/res.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'feedback-presentation',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__feedbackPresentation;s.calls++;s.args=args;s.op=op;if(s.transport)throw new Error('transport');if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};`}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessFeedback','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const receipts=[...output.matchAll(/ROBOT_FEEDBACK_RESPONSE=([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
const flatten=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?flatten(n.value):[n]);
const textOf=nodes=>flatten(nodes).map(n=>String(n.value??'')).join('');
const commands=nodes=>flatten(nodes).filter(n=>['MD.button','Button'].includes(n.type)).map(n=>n.options.data);
async function render(name,text,result){
 state.result=result;state.sent=[];state.calls=0;
 const e={name:'message.create',UserId:'player',MessageText:text,isPrivate:true};
 await framework.run(handlers[name], e, ()=>{throw new Error('unexpected next')});
 assert.equal(state.calls,1);assert.equal(state.sent.length,1);assert.equal(state.op,`feedback.${name}`);return state.sent[0];
}
test('feedback menus and selected input preserve original category buttons',async()=>{
 const row=receipts.find(r=>r.op==='feedback.compose'&&r.result.data?.categories?.length);
 let nodes=await render('compose','/提交反馈',row.result);assert.ok(textOf(nodes).includes('请选择反馈分类'));assert.ok(commands(nodes).includes('/提交反馈 1 '));assert.deepEqual(state.args,{mode:'menu',categoryId:null,content:''});
 nodes=await render('compose','/提交反馈 1',row.result);assert.ok(textOf(nodes).includes('【建议】请输入反馈内容（10-200字）：'));assert.ok(commands(nodes).includes('/提交反馈 1 '));
 nodes=await render('compose','/反馈 内容',row.result);assert.ok(textOf(nodes).includes('请先选择反馈分类：'));
});
test('feedback submission success and every refusal preserve text and buttons with one operation',async()=>{
 for(const row of receipts.filter(r=>r.op==='feedback.compose'&&!r.result.data?.categories)){
  const nodes=await render('compose','/提交反馈 1 这是超过十个字符的有效反馈内容',row.result);
  assert.equal(state.args.mode,'submit');
  if(row.result.success){assert.ok(textOf(nodes).includes(`成功反馈，编号为:${row.result.data.feedbackId}`));assert.ok(commands(nodes).includes(`/查看反馈 ${row.result.data.feedbackId}`));}
  else {const reply=row.result.middleware.replies.at(-1);assert.ok(textOf(nodes).includes(reply.text));for(const b of reply.buttons)assert.ok(commands(nodes).includes(b.command));}
 }
});
test('feedback mine keeps summary and view button in same quote, and detail is unchanged',async()=>{
 for(const row of receipts.filter(r=>['feedback.mine','feedback.detail'].includes(r.op))){
  const name=row.op.split('.')[1],data=row.result.data,id=data?.id??99,nodes=await render(name,name==='mine'?'/我的反馈':`/查看反馈 ${id}`,row.result);
  if(!row.result.success){assert.ok(textOf(nodes).includes(row.result.middleware.replies.at(-1).text));continue;}
  if(name==='detail')assert.ok(textOf(nodes).includes(`反馈信息id:${id}未收到回复`));
  else for(const item of data.items){const quote=nodes.find(n=>Array.isArray(n.value)&&textOf(n.value).includes(`【${item.id}】`));assert.ok(quote);assert.ok(commands(quote.value).includes(`/查看反馈 ${item.id}`));}
 }
});
test('feedback transport and bad DTO end with original errors',async()=>{
 for(const [name,text,error] of [['compose','/提交反馈','反馈提交失败'],['detail','/查看反馈 1','反馈信息\\反馈id 不存在'],['mine','/我的反馈','查询反馈记录失败']]){
  for(const transport of [true,false]){state.transport=transport;const nodes=await render(name,text,{success:true,data:{}});assert.ok(textOf(nodes).includes(error));}
 }
 state.transport=false;
});
