import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__storylineAllChests={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const exports="export {default as current} from './src/response/storyline/claimAllChests/res.ts';export {default as old} from 'old-storyline-all-chests';";
const bundle=await build({stdin:{contents:exports,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'soul-state',setup(b){
 b.onResolve({filter:/^old-(storyline-all-chests)$/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL('./fixtures/'+a.path+'-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:resolve('src/response/storyline/claimAllChests')}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const withBackendRepeatDetection=async(bid,uid,command,text)=>{const suffix=globalThis.__storylineAllChests.row.v1?.presentation?.repeat?.suffix;return suffix?text+'\\n\\n'+suffix:text};
 export const writeContext=request=>{if(!request?.idempotencyKey)throw new Error('missing identity');return request};
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__storylineAllChests;if(!s.kind.startsWith('old'))throw new Error('supplementary API');s.legacyCalls++;s.query={operation,args};if(s.row.status!==200)throw new Error(s.row.v1?.error?.message??'HTTP '+s.row.status);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__storylineAllChests;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessStorylineAllChests','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_STORYLINE_ALL_CHESTS=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,60);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageId:'soul-state',MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('storyline all chests preserves original success, refusal and usage bubbles',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'storyline.chests-claim-all',args:{}});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  assert.deepEqual(actual,await run('old',row,isPrivate),row.state+' '+row.text);
  assert.equal(state.legacyCalls,1);
  assert.equal(state.query.operation,'post_players_id_storyline_chests_claim_all');
 }
});
test('storyline all chests middleware calls parent next; malformed DTO and transport error end',async()=>{
 for(const row of rows.filter(r=>r.state==='muted')){
  await run('current',row,false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls.length,1);
 }
 for(const transport of [false,true])for(const row of rows.filter(r=>r.state==='ready'&&r.attempt===0)){
  state.transport=transport;await run('current',{...row,result:{success:true,branch:'business',data:{}}},false);
  assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);
 }state.transport=false;
});
