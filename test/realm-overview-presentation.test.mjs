import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import { createResult, ResultCode, logger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
logger.error=()=>{};
const state=globalThis.__realmOverview={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/realms/myRealm/res.ts';export {default as old} from 'old-realm';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'realm-overview',setup(b){
 b.onResolve({filter:/^old-realm$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/realm-overview-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const requestBackend=async()=>{const s=globalThis.__realmOverview;if(!s.kind.startsWith('old'))throw new Error('supplementary API');s.legacyCalls++;if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__realmOverview;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessRealmOverview','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_REALM_OVERVIEW=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,15);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('realm overview retains original private/group bubbles, material formatting and capability buttons',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'realm.overview',args:{}});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  assert.deepEqual(actual,await run('old',row,isPrivate),row.state);
 }
});
test('realm middleware calls parent next; transport or invalid receipt ends with original failure bubble',async()=>{
 await run('current',rows.find(r=>r.state==='muted'),false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls.length,1);
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/我的境界',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('查看境界信息时发生错误，请稍后再试。'));}state.transport=false;
});

const probabilityRows = [...output.matchAll(/ROBOT_REALM_PROBABILITY=(.+)/g)].map(match => JSON.parse(match[1]));
assert.equal(probabilityRows.length, 6);
test('foundation probability reaches real private/group messages with successful send receipts', async () => {
 for (const row of probabilityRows) for (const isPrivate of [false, true]) {
  Object.assign(state, { kind: 'current', row, calls: [], transport: false });
  const app = createTestApp();
  const receiptId = `realm-${row.state}-${isPrivate}`;
  app.actions.on('message.send', () => [createResult(ResultCode.Ok, 'Delivered', { id: receiptId })]);
  try {
   const result = await app.runHandler(handlers.current, {
    name: 'message.create', UserId: 'player', uid: 1, MessageText: '/我的境界', isPrivate
   });
   assert.deepEqual(result.errors, []);
   assert.equal(result.messages.length, 1);
   const sent = result.messages[0];
   assert.ok(sent.nodes.length > 0);
   const action = result.actions[sent.actionIndex];
   assert.equal(action.results[0].code, ResultCode.Ok);
   assert.equal(action.results[0].data.id, receiptId);
   const section = row.result.data.sections.find(section => section.title === '筑基概率');
   for (const line of section.lines) assert.ok(JSON.stringify(sent.nodes).includes(line), line);
   assert.equal(state.calls.length, 1);
   assert.deepEqual(sent.nodes, (await run('old', row, isPrivate))[0], row.state);
  } finally { await app.dispose(); }
 }
});
