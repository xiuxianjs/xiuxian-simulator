import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__top50Display = { sent: [], data: null, args: null };
const framework = createPresentationHarness(state);
const files = {
 battle: 'battle/leaderboard/res', regionalBattle: 'battle/leaderboard/regionRes',
 realm: 'leaderboard/realm/res', regionalRealm: 'leaderboard/realm/regionRes', popularity: 'leaderboard/popularity/res',
 master: 'master/rank/res', storyline: 'storyline/leaderboard/res', tower: 'demonTower/leaderboard/res', alchemy: 'alchemy/leaderboard/res'
};
const bundle = await build({
 stdin: { contents: Object.entries(files).map(([name,path])=>`export {default as ${name}} from './src/response/${path}.ts';`).join('\n'), resolveDir: process.cwd() },
 bundle:true,write:false,platform:'node',format:'esm',
 plugins:[{name:'top50-display',setup(builder){
  builder.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
  builder.onResolve({filter:/^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/},args=>({path:args.path,namespace:'test'}));
  builder.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args)=>{globalThis.__top50Display.args=args;return {handled:false,data:globalThis.__top50Display.data};};`}));
 }}]
});
const handlers = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const rows = Array.from({length:51},(_,i)=>({rank:i+1,uid:i+1,playerId:i+1,userId:i+1,name:`道友${i+1}`,userName:`道友${i+1}`,power:100,realmName:'筑基',experience:100,popularity:100,totalStars:3,highestLayer:1,title:'丹师',level:1,exp:100,totalCrafts:1,successRate:100,canLike:false,virtueTitle:'圣人',masterVirtueExp:10,totalGraduatedCount:0,activeDiscipleCount:1}));
const commands={battle:'战力排行榜',regionalBattle:'区战力排行榜',realm:'境界排行榜',regionalRealm:'区境界排行榜',popularity:'人气排行榜',master:'圣人排行榜',storyline:'主线排行榜',tower:'妖塔排行榜',alchemy:'丹师排行榜'};
function data(name,rank) {
 const base={self:rank===null?null:{...rows[0],rank},list:rows,nearby:[rows[50]],top:rows,items:rows.slice(10,20),page:2,totalPages:5,total:50,complete:true,building:false,time:0,canUseSpar:false};
 if(name==='storyline')return {ignored:false,data:{...base,items:rows.slice(10,20)}};
 if(name==='tower')return {access:{ok:true},leaderboard:{...base,list:rows.slice(10,20)}};
 if(name==='alchemy')return {...base,page:{current:2,total:5}};
 if(name==='battle'||name==='regionalBattle')return {...base,list:rows.slice(10,20)};
 return base;
}
function flatten(nodes){return nodes.flatMap(node=>Array.isArray(node.value)?flatten(node.value):[node]);}
test('all shared boards show ten entries, suppress unranked self, and use normal pages',async()=>{
 for(const name of Object.keys(files))for(const rank of [null,51,12,50,0]){
  state.data=data(name,rank);state.sent=[];
  const event={name:'message.create',UserId:'player',uid:999,MessageText:`/${commands[name]} 2`,isPrivate:true};
  await framework.invoke(event, async()=>{const value=handlers[name];for(const fn of Array.isArray(value.current)?value.current:[value.current])await fn(event,()=>{});}, ()=>{});
  assert.equal(state.sent.length,1,name);
  const nodes=flatten(state.sent[0]);
  const text=nodes.filter(node=>typeof node.value==='string').map(node=>node.value).join('\n');
  assert.equal((text.match(/ID:/g)??[]).length,10,name);
  const ranked = rank !== null && rank >= 1 && rank <= 50;
  assert.equal(text.includes(`我的排名：第${rank}名`),ranked,name);
  if(!ranked)assert.doesNotMatch(text,/我的排名|暂无个人|尚无.*记录|个人排名正在/);
  assert.doesNotMatch(text,/我的附近|附近排名|第51名/);
  assert.match(text,/第2\/5页/);
  assert.match(text,/ID:11\b/);assert.match(text,/ID:20\b/);
  if(['battle','regionalBattle','tower','alchemy','storyline'].includes(name))assert.equal(state.args.top50,true,name);
 }
});
