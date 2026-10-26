import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__booksPresentation={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as tianshu} from './src/response/tianshu/res.ts';export {default as baolu} from './src/response/tianshiBaolu/res.ts';export {default as oldTianshu} from 'old-tianshu';export {default as oldBaolu} from 'old-tianshiBaolu';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'books-presentation',setup(b){
 b.onResolve({filter:/^old-(tianshu|tianshiBaolu)$/},a=>({path:a.path,namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/books-${a.path.slice(4)}-before-v2.ts.txt`,import.meta.url),'utf8').replaceAll('for (const feature of item.features)', "for (const feature of item.features.filter(feature => feature !== '海外仙岛'))").replace('for (const note of content.notes)', "for (const note of content.notes.filter(note => !note.startsWith('海外仙岛')))"),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness|response-apps\/tianshiBaolu\/app)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},a=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{const s=globalThis.__booksPresentation;if(!s.legacyMode)throw new Error('unexpected game API');return s.result.data};export const writeContext=()=>({});
 export { useMessage } from 'alemonjs';
 export {parseTianshiBaoluCommand} from '${pathToFileURL(resolve('src/api/bot/tianshi-baolu-command.ts')).href}';
 export default async()=>globalThis.__booksPresentation.legacy;
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__booksPresentation;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
 // Share the actual pure command parser with the legacy seam.
 b.onResolve({filter:/^file:.*tianshi-baolu-command.ts$/},a=>({path:fileURLToPath(a.path)}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessBooks','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const rows=[...output.matchAll(/ROBOT_BOOKS_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),bid:m[3],result:JSON.parse(m[4]).data}));
const flatten=nodes=>nodes.flatMap(n=>Array.isArray(n.value)?flatten(n.value):[n]);
const textOf=nodes=>flatten(nodes).map(n=>String(n.value??'')).join('');
const commands=nodes=>flatten(nodes).filter(n=>['MD.button','Button'].includes(n.type)).map(n=>n.options.data);
async function render(name,text='/天书'){state.sent=[];state.calls=0;state.next=0;state.legacyMode=name.startsWith('old');const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate:true};await framework.run(handlers[name], e, ()=>{state.next++});return state.sent;}
test('books retain active stages, unlock text, categories and pagination without retired island content',async()=>{
 for(const row of rows.filter(r=>r.result.success&&r.result.branch==='business')){
  const book=row.op==='tianshu.content',name=book?'tianshu':'baolu';state.result=row.result;state.legacy={code:'OK',data:row.result.data};const label={all:'全部',equipment_set:'装备',skill_book:'功法',soul_artifact:'本命'}[row.args.category]??'全部';const text=book?'/天书':`/天师宝录 ${label} p${row.args.page}`;
  const actual=await render(name,text);assert.equal(state.calls,1);assert.equal(state.op,row.op);assert.equal(state.next,0);assert.equal(actual.length,1);if(book){
   const data=row.result.data;
   if(!data.featureCatalog)assert.deepEqual(actual,await render('oldTianshu',text));
   else{
    const shown=data.featureCatalog.filter(group=>group.stageLevel===data.currentStage?.stageLevel||group.stageLevel===data.nextStage?.stageLevel).flatMap(group=>group.features).filter(feature=>!feature.name.includes('海外仙岛'));
    const body=textOf(actual[0]);
    for(const feature of shown){
     assert.ok(body.includes(`${feature.name} · ${feature.realmReached?'已开放':'待开放'} · ${feature.realm}`));
     assert.ok(body.includes(feature.description));
    }
    assert.ok(!/第\d+\/\d+页/.test(body));
    assert.ok(commands(actual[0]).includes('/天书 1'));
    assert.ok(!body.includes('海外仙岛'));
   }
  }
  if(!book){const text=textOf(actual[0]);assert.ok(text.includes(`总进度：${row.result.data.unlockedCount}/${row.result.data.totalCount}`));assert.ok(text.includes('全宝录累计加成（所有已点亮条目）：'));assert.ok(row.result.data.totalBonusText.split('、').every(part=>text.includes(part)));for(const r of row.result.data.rows){assert.ok(text.includes(r.name));assert.ok(text.includes(r.condition));assert.ok(text.includes(`${r.unlocked?'已点亮加成':'点亮后增加'}：${r.bonusText}`));}for(const category of ['全部','装备','功法','本命'])assert.ok(commands(actual[0]).includes(`/天师宝录 ${category}`));}
 }
});
test('baolu business refusals keep original feedback bubble without next',async()=>{
 for(const row of rows.filter(r=>!r.result.success)){state.result=row.result;state.legacy={code:'LOAD_FAILED',data:{message:'查看天师宝录失败，请稍后再试'}};const actual=await render('baolu','/天师宝录');assert.equal(state.calls,1);assert.equal(state.next,0);assert.deepEqual(actual,await render('oldBaolu','/天师宝录'));}
});
test('books transport or invalid DTO uses original failure text and never another request',async()=>{
 for(const name of ['tianshu','baolu'])for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render(name,name==='tianshu'?'/天书':'/天师宝录');assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.ok(textOf(state.sent[0]).includes(name==='tianshu'?'天书暂时不可用，请稍后重试。':'查看天师宝录失败，请稍后再试'));}state.transport=false;
});
test('baolu backend middleware delegates without emitting business bubble',async()=>{
 const row=rows.find(r=>r.result.branch==='middleware');assert.ok(row);state.result=row.result;await render('baolu','/天师宝录');assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);
});
