import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';


const state = globalThis.__meditationEntry = { sent: [], calls: [], data: {} };
const framework = createPresentationHarness(state, { capture: 'payload' });
const bundle = await build({
  stdin: { contents: "export {default as start} from './src/response/meditation/start/res.ts';export {default as end} from './src/response/meditation/end/res.ts';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'meditation-entry', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/utils\/messageHelper$/ }, () => ({ path: resolve('src/utils/messageHelper.ts') }));
    builder.onResolve({ filter: /^@src\/(api$|api\/bot\/meditation$|utils\/(messageHelper|useMessage)$|response\/(config|finalBusiness)$|response-apps\/meditation\/(start|end)\/app$)/ }, a => ({ path: a.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^[^./]/ }, a => a.path.startsWith('@src/') ? undefined : ({ path: import.meta.resolve(a.path), external: true }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `
      export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
      export const createBackendRequestContext=()=>({});
      export const parseMeditationBoostOptions=x=>x,parseMeditationStart=x=>x,parseMeditationEnd=x=>x;
      export const FormatGui=p=>({...p,content:p.content.value});
      export { useMessage } from 'alemonjs';
      export const loadFinalBusiness=async(e,next,op,args)=>{globalThis.__meditationEntry.calls.push({op,args});return {handled:false,load:async()=>globalThis.__meditationEntry.data}};
      export default async function App(p){return {code:'OK',data:await p.load()}}
    ` }));
  } }]
});
const h = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
function buttons(value) {
  if (!value || typeof value !== 'object') return [];
  return [ ...(value.type === 'MD.button' ? [value] : []), ...Object.values(value).flatMap(buttons) ];
}
async function render(handler, text, data, isPrivate = false) {
  state.sent = []; state.calls = []; state.data = data;
  const event = { name: 'message.create', UserId: 'player', uid: 1, MessageText: text, isPrivate };
  await framework.run(h[handler], event, () => {});
  const message = framework.result.messages[0];
  const title = message.nodes.filter(node => node.type === 'Markdown').flatMap(node => node.value).find(node => node.type === 'MD.bold')?.value;
  return { content: message.nodes, title };
}

for (const command of ['/闭关加速','/打坐加速','/闭关 灵石 8']) {
 test(`${command} displays one setting instead of selling time`,async()=>{
  const page=await render('start',command,{enabled:true,autoEnabled:false,multiplier:1.5,pricePerInterval:25});
  assert.deepEqual(state.calls,[{op:'meditation.boost-options',args:{}}]);
  assert.deepEqual(buttons(page.content).map(b=>b.options.data),['/配置闭关自动加速 开启','/闭关','/我的设置']);
  const text=JSON.stringify(page.content);
  assert.ok(text.includes('出关时按可用灵石结算'));
  assert.ok(!text.includes('预付'));
 });
}
for (const isPrivate of [false,true]) {
 test(`approved progress bubble uses actual bonuses and one claim action (${isPrivate})`,async()=>{
  const page=await render('start','/闭关',{
   success:true,alreadyMeditating:true,elapsedText:'3小时44分钟',expSoFar:87,qiSoFar:21,
   bonusLines:['金手指：修为+10% · 真气+30%','灵根：修为+20%'],
   boost:{enabled:true,multiplier:1.5,estimatedCharge:350,reservedStone:0,billingMode:'settlement'}
  },isPrivate);
  assert.equal(page.title,'闭关中 · 灵石加速');
  const text=JSON.stringify(page.content);
  for(const line of ['已修炼 3小时44分钟','当前可领取：修为87 · 真气21','本轮加成：','金手指：修为+10% · 真气+30%','灵根：修为+20%','本次加速费用：350灵石'])assert.ok(text.includes(line),line);
  for(const removed of ['预付','预算','退款','最长','金手指可强化'])assert.ok(!text.includes(removed),removed);
  assert.deepEqual(buttons(page.content).map(b=>b.options.data),['/出关']);
  assert.ok(!framework.result.messages[0].commands.includes('/闭关加速'));
 });
}
test('ordinary progress never advertises inactive bonuses',async()=>{
 const page=await render('start','/闭关',{success:true,elapsedText:'0小时0分钟',qiSoFar:0,expSoFar:0,bonusLines:[],bonusLine:'金手指可强化闭关'});
 assert.equal(page.title,'闭关中');
 assert.ok(!JSON.stringify(page.content).includes('金手指'));
 assert.deepEqual(state.calls,[{op:'meditation.start',args:{boostHours:0}}]);
});
test('exit displays credited rewards and actual cost, with legacy refund only when needed',async()=>{
 for(const refund of [0,450]){
  const page=await render('end','/出关',{success:true,elapsedText:'3小时44分钟',qiGained:21,expGained:100,creditedExperience:87,bonusLines:['金手指：修为+10% · 真气+30%'],boost:{consumedStone:350,refundedStone:refund}});
  const text=JSON.stringify(page.content);
  assert.ok(text.includes('本次获得修为：87'));
  assert.ok(text.includes('本次获得真气：21'));
  assert.ok(text.includes('本次加速费用：350灵石'));
  assert.equal(text.includes('历史预付退回'),refund>0);
  assert.deepEqual(buttons(page.content).map(b=>b.options.data),['/闭关']);
 }
});
