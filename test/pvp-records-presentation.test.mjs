import { ResultCode } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__pvp={sent:[],calls:0};
const framework = createPresentationHarness(state);
const files={records:'robberyRecord/res'};
const decoders={records:'parseRobberyRecords'};
const bundle=await build({stdin:{contents:Object.entries(files).map(([n,p])=>`export {default as ${n}} from './src/response/${p}.ts';export {default as old_${n}} from 'old-${n}';`).join('\n')+`export {parseRobberyRecords} from './src/api/bot/robbery-records.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'pvp',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/pvp-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot(?:\/context)?)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/response-apps\/robberyRecord\/app$/},a=>({path:a.path,namespace:'app'}));
 b.onLoad({filter:/.*/,namespace:'app'},()=>({contents:`export default async()=>globalThis.__pvp.app;`}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const writeContext=()=>({});export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API')};export const createBackendRequestContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__pvp;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessPVPRecords','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
const rows=[...output.matchAll(/ROBOT_RECORDS_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({page:Number(m[1]),text:m[2],result:JSON.parse(m[3]).data}));assert.ok(rows.length>=10);
async function render(name,text,isPrivate){state.sent=[];state.calls=0;state.next=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:text,isPrivate};await framework.run(h[name], e, ()=>{state.next++});return state.sent;}
// Compare legacy layout separately from the adopted full game-time formatting.
const normalizeLegacyTime=value=>JSON.parse(JSON.stringify(value).replace(/\d{4}-(\d{2}-\d{2} \d{2}:\d{2}):\d{2}/g,'$1'));
test('actual records receipts preserve native private/group bubbles, pagination, losses, drops, empty names and counter buttons',async()=>{
 for (const row of rows.filter(r => r.result.branch === 'business')) for (const isPrivate of [true, false]) {
  state.result = row.result;
  state.app = row.result.success ? { code: 'OK', data: h.parseRobberyRecords(row.result.data) } : { code: 'LOAD_FAILED', data: { message: row.result.middleware.replies.at(-1).text } };
  const actual = await render('records', row.text, isPrivate);
  assert.equal(state.calls, 1); assert.equal(state.next, 0); assert.equal(state.op, 'pvp.records'); assert.deepEqual(state.args, { page: row.page }); assert.equal(actual.length, 1);
  const delivery = framework.result;
  assert.equal(delivery.actions[delivery.messages[0].actionIndex].results[0].code, ResultCode.Ok);
  const old = await render('old_records', row.text, isPrivate);
  const records = row.result.success ? h.parseRobberyRecords(row.result.data).records : [];
  if (!records.length) { assert.deepEqual(normalizeLegacyTime(actual), normalizeLegacyTime(old)); continue; }
  // The layout intentionally changes; retain exact navigation/action parity and
  // check every server fact in its own line, including empty display names.
  const view = inspectMessage(actual.flat());
  assert.deepEqual(view.commands, inspectMessage(old.flat()).commands);
  const quotes = actual.flat().filter(block => block.type === 'Markdown').flatMap(block => block.value.filter(node => node.type === 'MD.blockquote'));
  assert.equal(quotes.length, records.length);
  for (const [index, record] of records.entries()) {
   const actor = record.isCounterAttack ? '反击方' : '进攻方';
   const expected = [`【战报 #${record.id}】`, `时间：${new Date(record.createdAt).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })}`, `${actor}：${record.attackerDisplayName}`, `类型：${record.typeText}`, `战斗结果：${actor}${record.isWin ? '获胜' : '未获胜'}`];
   if (record.lossText) {
    const loss = record.lossText.match(/^损失：(.*)$/);
    expected.push('', ...(loss ? ['损失：', ...loss[1].split('、').map(value => value.replace(/^(灵石|灵晶)-/, '$1 -'))] : [record.lossText]));
   }
   if (record.dropText) expected.push(`物品状态：${record.dropText}`);
   if (record.counterStatusText) expected.push(`反击状态：${record.counterStatusText}`);
   if (record.counterDeadline) expected.push(`反击截止：${new Date(record.counterDeadline).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' })}`);
   const texts = quotes[index].value.filter(node => node.type === 'MD.text').map(node => node.value);
   assert.deepEqual(texts, [...expected, ...(record.canCounterAttack ? [' '] : [])]);
  }
 }
});
test('records page clamps precede one request; admission delegates and failures never retry or next',async()=>{
 const muted=rows.find(r=>r.result.branch==='middleware').result;
 for(const [text,page] of [['/打劫记录',1],['/打劫记录 0',1],['/打劫记录 0002',2],['/打劫记录 101',100],['/打劫记录 '+'1'+'0'.repeat(400),100]]){state.result=muted;await render('records',text,true);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.deepEqual(state.args,{page});}
 for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render('records','/打劫记录',true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);}state.transport=false;
});
