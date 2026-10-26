import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__otherBoards={sent:[],calls:0};
const framework = createPresentationHarness(state);
const files={realm_res:'leaderboard/realm/res',realm_regionRes:'leaderboard/realm/regionRes',popularity_res:'leaderboard/popularity/res',popularity_like:'leaderboard/popularity/like/res'};
const bundle=await build({stdin:{contents:Object.entries(files).map(([n,p])=>`export {default as ${n}} from './src/response/${p}.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export {parseRobotRealmRanking} from './src/api/bot/realm-ranking-queries.ts';export {parseRobotPopularity} from './src/api/bot/popularity-queries.ts';export {parseRobotPopularityLike} from './src/api/bot/popularity-like.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'battleQueries',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/${a.path.replaceAll('_','-')}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/response\/access\/fifthLayer$/},()=>({path:resolve('src/response/access/fifthLayerView.ts')}));
 b.onResolve({filter:/^@src\/(utils\/(?:useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|api\/bot\/(?:context|identity))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/leaderboard\/(realm\/(?:app|regionApp)|popularity\/(?:app|like\/app))$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>globalThis.__otherBoards.app;`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const getBackendRobotIdentity=async bid=>{if(!globalThis.__otherBoards.old)throw new Error('unexpected identity API');return{account:bid==='unknown'?{status:'unregistered'}:{status:'registered',playerId:bid==='player'?1:2}}};
 export const withBackendRepeatDetection=async(bid,uid,command,text)=>{if(!globalThis.__otherBoards.old)throw new Error('unexpected repeat API');return text};
 export const writeContext=()=>({});export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const createBackendRequestContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__otherBoards;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessOtherBoards','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_OTHER_BOARD_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=30);
const names={'leaderboard.realm':'realm_res','leaderboard.realm-region':'realm_regionRes','leaderboard.popularity':'popularity_res','popularity.like':'popularity_like'};
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;state.old=name.startsWith('old_');const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};if(row.args.target?.bid)e.MessageMentions=[{UserId:row.args.target.bid,UserKey:row.args.target.bid,IsMaster:false,IsBot:false}];await framework.run(h[name], e, ()=>{state.next++});return state.sent;}
function original(row){if(row.result.success){const data=row.op==='popularity.like'?{...h.parseRobotPopularityLike(row.result.data),success:true}:row.op==='leaderboard.popularity'?h.parseRobotPopularity(row.result.data):h.parseRobotRealmRanking(row.result.data);return{code:'OK',data};}const reply=row.result.middleware.replies.at(-1);if(row.op==='leaderboard.popularity'&&reply.buttons.length)return{code:'OK',data:{canUseFifthLayerFeature:false,realmName:'未知'}};if(reply.buttons.length)return{code:'LOCKED',data:{realmName:'未知'}};if(row.op==='popularity.like')return{code:reply.text==='人气点赞失败，请稍后再试'?'LOAD_FAILED':'OK',data:{message:reply.text,success:false}};return{code:reply.text.startsWith('你当前')?'NO_REGION':'LOAD_FAILED',data:{message:reply.text}};}
test('realm/region/popularity boards use top-fifty presentation while like and refusal retain original bubbles',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [true,false]){const name=names[row.op];state.result=row.result;state.app=original(row);const actual=await render(name,row,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.op,row.op);assert.deepEqual(state.args,row.args,row.text);assert.equal(actual.length,row.result.success&&row.result.data.outcome==='ignored'?0:1);if(!row.result.success||row.op==='popularity.like')assert.deepEqual(actual,await render('old_'+name,row,isPrivate),row.text);else assert.doesNotMatch(JSON.stringify(actual),/我的附近|暂无个人排名|尚未收到点赞/);}
});
test('board view aliases and local transport/DTO failures never supplement game requests',async()=>{
 for(const op of ['leaderboard.realm','leaderboard.realm-region','leaderboard.popularity']){const source=rows.find(r=>r.op===op&&r.result.success&&r.result.branch==='business');for(const token of ['榜首','附近','我的','2','999','0','1'+'0'.repeat(400)]){const row={...source,text:source.text+' '+token};state.result=row.result;state.app=original(row);const actual=await render(names[op],row,false);assert.equal(state.calls,1);assert.doesNotMatch(JSON.stringify(actual),/我的附近|暂无个人排名|尚未收到点赞/);}}
 for(const op of Object.keys(names))for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render(names[op],{text:op==='popularity.like'?'/点赞人气 2 battle':op==='leaderboard.realm'?'/境界排行榜':op==='leaderboard.realm-region'?'/区境界排行榜':'/人气排行榜',args:{}},true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);}state.transport=false;
});

test('like keeps argument-first/mention fallback parsing and delegates admission even for invalid targets',async()=>{
 const muted=rows.find(r=>r.result.branch==='middleware').result;
 for(const [text,target] of [['/点赞人气 0 battle',null],['/点赞人气 9007199254740992 battle',null],['/点赞人气 0002 battle',{uid:2}],['/点赞人气 abc battle',{bid:'market-writer'}],['/点赞人气 0 battle',{bid:'market-writer'}]]){
  const row={text,args:{target,boardType:'battle'}};state.result=muted;await render('popularity_like',row,true);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.deepEqual(state.args,row.args);
 }
});
