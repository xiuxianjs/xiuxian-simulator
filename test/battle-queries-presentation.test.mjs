import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__battleQueries={sent:[],calls:0};
const framework = createPresentationHarness(state);
const files={res:'battle/leaderboard/res',regionRes:'battle/leaderboard/regionRes',viewLog:'battle/viewLog/res'};
const bundle=await build({stdin:{contents:Object.entries(files).map(([n,p])=>`export {default as ${n}} from './src/response/${p}.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export {parseRobotBattleLeaderboard} from './src/api/bot/battle-leaderboard-queries.ts';export {parseRobotBattleLog} from './src/api/bot/battle-log-query.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'battleQueries',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/battle-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/response\/access\/fifthLayer$/},()=>({path:resolve('src/response/access/fifthLayerView.ts')}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/battle\/(leaderboard|viewLog)\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>globalThis.__battleQueries.app;`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const createBackendRequestContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__battleQueries;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessBattleQueries','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_BATTLE_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.ok(rows.length>=32);
async function render(name,row,isPrivate){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(h[name], e, ()=>{state.next++});return state.sent;}
function original(row){const log=row.op==='battle.log';if(row.result.success){if(!log)return{code:'OK',data:h.parseRobotBattleLeaderboard(row.result.data)};const d=h.parseRobotBattleLog(row.result.data,row.args.logId);return d.text?{code:'OK',data:{log:d.text}}:{code:'MEMORY_ONLY'};}const reply=row.result.middleware.replies.at(-1);if(log)return reply.text==='请提供战斗日志ID'?{code:'MISSING_ID'}:{code:reply.text.startsWith('查看战斗过程失败')?'FAIL':'NOT_FOUND',data:{message:reply.text}};return reply.buttons.length?{code:'LOCKED',data:{realmName:'未知'}}:{code:'LOAD_FAILED',data:{message:reply.text}};}
test('battle boards and logs preserve original private/group bubbles, navigation, code text, memory-only and repeats',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [true,false]){const name=row.op==='battle.log'?'viewLog':row.op==='leaderboard.battle'?'res':'regionRes';state.result=row.result;state.app=original(row);const actual=await render(name,row,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.op,row.op);assert.deepEqual(state.args,row.args,row.text);assert.equal(actual.length,1);assert.deepEqual(actual,await render('old_'+name,row,isPrivate),row.text);}
});
test('board aliases and transport/decode failure never add requests or enter fallback',async()=>{
 const complete=rows.find(r=>r.op==='leaderboard.battle'&&r.result.success&&r.result.branch==='business');
 for(const [name,command] of [['res','/战力排行榜'],['regionRes','/区战力排行榜']])for(const suffix of ['榜首','附近','我的']){const row={...complete,text:command+' '+suffix,args:{page:'1'}};state.result=row.result;state.app=original(row);const actual=await render(name,row,false);assert.equal(state.calls,1);assert.deepEqual(state.args,{page:'1'});assert.deepEqual(actual,await render('old_'+name,row,false));}
 for(const name of ['res','regionRes','viewLog'])for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render(name,{text:name==='viewLog'?'/查看战斗过程 fault':name==='res'?'/战力排行榜':'/区战力排行榜'},true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);}state.transport=false;
});
