import { inspectMessage } from 'alemonjs/testing';
import { ResultCode } from 'alemonjs';
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
const state=globalThis.__notificationHistory={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/notification/history/res.ts';export {default as old} from 'old-history';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'notification-history',setup(b){
 b.onResolve({filter:/^old-history$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/notification-history-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const requestBackend=async()=>{const s=globalThis.__notificationHistory;if(!s.kind.startsWith('old'))throw new Error('supplementary API');s.legacyCalls++;if(s.row.status!==200)throw new Error(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__notificationHistory;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessNotificationHistory','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_NOTIFICATION_HISTORY=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,140);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
test('notification history retains original page title, private/group bubbles and paging buttons',async()=>{
 for(const row of rows.filter(r=>r.state!=='muted'))for(const isPrivate of [false,true]){
  const actual=await run('current',row,isPrivate);
  assert.equal(state.calls.length,1);assert.deepEqual(state.calls[0],{op:'notifications.history',args:row.arguments});assert.equal(state.legacyCalls,0);assert.equal(state.next,0);
  const delivery = framework.result;
  assert.equal(delivery.actions[delivery.messages[0].actionIndex].results[0].code, ResultCode.Ok);
  const old=await run('old',row,isPrivate);
  assert.equal(actual.length, 1);
  const view = inspectMessage(actual.flat());
  assert.deepEqual(view.commands, inspectMessage(old.flat()).commands, row.state);
  const records = row.result.success ? row.result.data.items : [];
  if (!records.length) {
   // No record layout changed: feedback and empty-page text remain identical.
   const legacy = inspectMessage(old.flat()).text.replace('异步事件记录；查看不会领取奖励或处理申请。\n', '').trim();
   assert.equal(view.text.trim(), legacy, row.state);
   continue;
  }
  const quotes = actual.flat().filter(block => block.type === 'Markdown').flatMap(block => block.value.filter(node => node.type === 'MD.blockquote'));
  assert.equal(quotes.length, records.length, row.state);
  for (const [index, item] of records.entries()) {
   const match = item.text.match(/^【([^\n】]+)】\n\n/);
   const expected = [`【${index + 1}】${match?.[1] ?? '修仙 · 通知'}`, `时间：${new Date(item.time).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })}`, '', ...(match ? item.text.slice(match[0].length) : item.text).split('\n'), '', `通知投递：${item.delivery}`];
   assert.deepEqual(quotes[index].value.filter(node => node.type === 'MD.text').map(node => node.value), expected, row.state);
   assert.equal(quotes[index].value.filter(node => node.type === 'MD.newline').length, expected.length - 1, row.state);
  }
 }
});
test('notification middleware calls parent next; transport or invalid receipt ends with original failure bubble',async()=>{
 await run('current',rows.find(r=>r.state==='muted'),false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls.length,1);
 for(const transport of [false,true]){state.transport=transport;await run('current',{text:'/我的通知',result:{success:true,branch:'business',data:{}}},false);assert.equal(state.calls.length,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);assert.ok(JSON.stringify(state.sent).includes('通知记录暂时无法加载，请稍后再试。'));}state.transport=false;
});
