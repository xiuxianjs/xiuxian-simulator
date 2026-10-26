import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__glossaryPresentation={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as query} from './src/response/glossary/query/res.ts';export {default as category} from './src/response/glossary/category/res.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'glossary-presentation',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__glossaryPresentation;s.calls++;s.args=args;s.op=op;if(s.transport)throw new Error('transport');if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};`}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessGlossaryQueries','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const receipts=[...output.matchAll(/ROBOT_GLOSSARY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),result:JSON.parse(m[3]).data}));
const flatten=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?flatten(n.value):[n]);
const textOf=nodes=>flatten(nodes).map(n=>String(n.value??'')).join('');
const commands=nodes=>flatten(nodes).filter(n=>['MD.button','Button'].includes(n.type)).map(n=>n.options.data);
async function render(row){
 const name=row.op.split('.')[1],{keyword,category,page}=row.args;
 const text=name==='query'?`/词典${keyword?' '+keyword:''}${page===1?'':' p'+page}`:`/词典分类${category?' '+category:''}${page===1?'':' p'+page}`;
 state.result=row.result;state.sent=[];state.calls=0;
 const e={name:'message.create',UserId:'player',MessageText:text,isPrivate:true};
 await framework.run(handlers[name], e, ()=>{throw new Error('unexpected next')});
 assert.equal(state.calls,1);assert.equal(state.op,row.op);assert.equal(state.sent.length,1);return state.sent[0];
}
test('glossary exact entries preserve content, author, edit count and navigation',async()=>{
 for(const row of receipts.filter(r=>r.result.data.exact)){
  const nodes=await render(row),entry=row.result.data.exact,text=textOf(nodes);
  assert.ok(text.includes(`【${entry.keyword}】【${entry.category}】`));assert.ok(text.includes(entry.content));assert.ok(text.includes(`作者：${entry.authorName}`));assert.ok(text.includes(`编辑${entry.editCount}次`));assert.ok(text.includes(`最后编辑：${entry.lastEditorName}`));assert.ok(commands(nodes).includes(`/词典分类 ${entry.category}`));
 }
});
test('glossary browse and fuzzy pages retain 30-character summaries and same-quote view buttons',async()=>{
 for(const row of receipts.filter(r=>r.result.data.page)){
  const nodes=await render(row),data=row.result.data.page;
  for(const item of data.items){const quote=nodes.find(n=>Array.isArray(n.value)&&textOf(n.value).includes(`【${item.keyword}】`));assert.ok(quote);assert.ok(textOf(quote.value).includes(item.content.slice(0,30)+'...'));assert.ok(commands(quote.value).includes(`/词典 ${item.keyword}`));}
  if(!data.items.length){const text=textOf(nodes);assert.ok(text.includes('未找到')||text.includes('词典暂无内容'));}
 }
});
test('glossary category menu and invalid category retain original fixed choices and guidance',async()=>{
 for(const row of receipts.filter(r=>r.op==='glossary.category'&&!r.result.data.page)){
  const nodes=await render(row),policy=row.result.data.policy;
  if(row.args.category)assert.ok(textOf(nodes).includes(`❌ 未知分类「${row.args.category}」`));else assert.ok(textOf(nodes).includes('📂 选择要浏览的词典分类：'));
  for(const category of policy.categories)assert.ok(commands(nodes).includes(`/词典分类 ${category}`));
 }
});
test('glossary transport and bad DTO still throw without extra APIs or sending fabricated bubbles',async()=>{
 const row=receipts[0];
 for(const transport of [true,false]){state.transport=transport;await assert.rejects(()=>render({...row,result:{success:true,data:{}}}));assert.equal(state.calls,1);assert.equal(state.sent.length,0);}
 state.transport=false;
});
