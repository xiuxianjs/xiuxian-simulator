import { inspectMessage } from 'alemonjs/testing';
import { mentionsRetiredFeature } from '../src/response/retiredFeatures.ts';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__leaderboardMenu={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/leaderboard/res.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'leaderboard-menu',setup(b){
 b.onResolve({filter:/^@src\/api\/bot$/},()=>({path:resolve('src/api/bot/leaderboard-catalog.ts')}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({resolveDir:process.cwd(),contents:`
 import {withBusinessRecovery} from '${resolve('src/response/businessRecovery.ts')}';
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__leaderboardMenu;if(!s.kind.startsWith('old'))throw new Error('supplementary API');s.legacyCalls++;s.query=args?.query;if(s.row.status!==200)throw new Error(s.row.v1?.error?.message??'query failed');return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__leaderboardMenu;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(withBusinessRecovery(op,r.middleware.replies.at(-1)));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessLeaderboardMenu','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_LEADERBOARD_MENU=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,12);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('leaderboard tabs use the activity hub layout and reach every active board', async () => {
 const tabs=['/排行榜 综合榜','/排行榜 玩法榜'];
 const toolbar=['/我','/属性面板','/查看主线','/我的活动','/商店'];
 for(const row of rows.filter(r=>r.state==='ready')) for(const isPrivate of [false,true]){
  const entries=row.v1.data.flatMap(({menu})=>menu && !mentionsRetiredFeature(menu.command) && !mentionsRetiredFeature(menu.label)?[menu]:[]);
  const descriptions=new Map(entries.map(entry=>[entry.command,entry.description]));
  const render=async text=>{
   const actual=await run('current',{...row,text},isPrivate);
   assert.deepEqual(state.calls,[{op:'leaderboard.menu',args:row.arguments}]);
   assert.equal(state.legacyCalls,0);
   assert.equal(state.next,0);
   assert.equal(actual.length,1);
   const view=inspectMessage(actual[0]);
   assert.deepEqual(view.commands.slice(0,2),tabs);
   assert.deepEqual(view.commands.slice(-5),toolbar);
   assert.ok(!view.text.includes(row.v1.data.find(entry=>entry.menuHint).menuHint));
   const markdown=actual[0].find(node=>node.type==='Markdown');
   const blocks=markdown.value.filter(node=>node.type==='MD.blockquote');
   const commands=blocks.map(({value})=>{
    assert.deepEqual(value.map(node=>node.type),['MD.button','MD.text']);
    const [button,description]=value;
    assert.equal(button.options.autoEnter,false);
    assert.ok([...button.options.data].length<=80);
    assert.equal(description.value,' — '+descriptions.get(button.options.data));
    return button.options.data;
   });
   assert.deepEqual(view.commands.slice(2,-5),commands);
   return {view,commands};
  };
  const general=await render('/排行榜');
  assert.ok(general.view.text.includes('▸综合榜'));
  assert.match(general.view.text,/个人主线榜/);
  assert.match(general.view.text,/宗门主线榜/);
  assert.deepEqual(general.commands.slice(6,9),['/灵石榜','/灵晶榜','/珍宝楼商誉榜']);
  const gameplay=await render(tabs[1]);
  assert.ok(gameplay.view.text.includes('▸玩法榜'));
  assert.deepEqual((await render('/排行榜 2')).view.commands,gameplay.view.commands);
  assert.deepEqual((await render(tabs[0])).view.commands,general.view.commands);
  assert.deepEqual([...general.commands,...gameplay.commands].sort(),entries.map(entry=>entry.command).sort());
 }
});
test('leaderboard middleware calls parent next; transport or invalid receipt ends with original failure bubble',async()=>{
 await run('current',rows.find(r=>r.state==='muted'),false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls.length,1);
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/排行榜',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('排行榜')); }state.transport=false;
});
test('leaderboard false feedback keeps original error bubble and ends without next',async()=>{
 const row={...rows[0],status:400,v1:{error:{message:'目录暂不可用'}},result:{success:false,branch:'business',middleware:{replies:[{title:'',heading:'',text:'目录暂不可用',buttons:[],advice:[]}]}}};
 const actual=await run('current',row,false);
 assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);
 assert.equal(actual.length,1);
 const view=inspectMessage(actual[0]);
 assert.ok(view.text.includes('目录暂不可用'));
 assert.ok(view.text.includes('查询失败不能说明排名下降或数据清零'));
 assert.ok(view.commands.includes('/排行榜'));
});
