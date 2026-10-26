import { inspectMessage } from 'alemonjs/testing';
import { ResultCode } from 'alemonjs';
import { rechargeBubbleSemantics } from './helpers/recharge-bubble-semantics.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__normalPayment={};
const framework = createPresentationHarness(state, { persistent: true });
globalThis.__normalPaymentError=class BackendAPIError extends Error {};
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessNormalPayment','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const createRows=[...output.matchAll(/ROBOT_NORMAL_PAYMENT_CREATE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(createRows.length,126);
const observeRows=[...output.matchAll(/ROBOT_NORMAL_PAYMENT_OBSERVE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(observeRows.length,22);
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {default as current} from './src/response/recharge/pay/res.ts';export {default as old} from 'old-payment';`},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'event-payment',setup(b){
 b.onResolve({filter:/^@alemonjs\/qq-bot$/},()=>({path:import.meta.resolve('@alemonjs/qq-bot'),external:true}));
    b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^qrcode$/},()=>({path:import.meta.resolve('qrcode'),external:true}));
 b.onResolve({filter:/^old-payment$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/normal-pay-before-v2.ts.txt',import.meta.url),'utf8').replace("        md.addText('⚠️⚠️⚠️限时活动临时套餐请使用 /活动充值；普通充值不会触发限时活动规则。');\n        md.addNewline();\n",''),resolveDir:resolve('src/response/recharge/pay')}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|imageRender)|img\/views\/PayQrCode|response\/(config|robotBusiness)|api\/bot\/(identity|robot-business))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$|^@src\/api\/bot\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export default function PayQrCode(){};
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const BackendAPIError=globalThis.__normalPaymentError;
 export const writeContext=()=>({});
 export const getBackendRobotIdentity=async()=>{const s=globalThis.__normalPayment;s.identities++;return {account:{playerId:1}}};
 export { useMessage } from 'alemonjs';
 export const renderCachedImage=async(component,props)=>{const s=globalThis.__normalPayment;s.images.push(props);return s.renderFail?false:Buffer.from('original-image')};
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__normalPayment;s.legacy.push({operation,args});if(s.create.transport)throw new BackendAPIError('测试请求失败');let row=['post_players_id_payments_orders','get_players_id_recharge_normal_packages'].includes(operation)?s.create:operation.endsWith('_settlement')?{status:s.observe.receiptStatus,v1:s.observe.receipt}:operation.endsWith('_cancel')?{status:200,v1:{data:{cancelled:s.observe.state==='PENDING'}}}:{status:s.observe.status,v1:s.observe.v1};if(s.kind==='current')throw new Error('supplementary API');if(row.status!==200&&row.status!==201)throw new BackendAPIError((row.message??'legacy error').replace(/^❌ /,''));return row.v1.data};
 export const isRobotPublicEntry=()=>false;export const requestRobotBusiness=async(e,operation,args,decode)=>{const s=globalThis.__normalPayment;s.calls.push({operation,args});if(s.create.transport)throw new BackendAPIError('测试请求失败');if(s.deferred)await s.deferred;const r=operation.endsWith('payment-create')?s.create.result:s.observe.result;return r.success&&r.branch==='business'?{...r,data:decode(r.data,1)}:r};
 export const finishRobotBusiness=async(e,r,next,feedback)=>{if(r.success&&r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:r.data}};
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>finishRobotBusiness(e,await requestRobotBusiness(e,op,args,decode),next,feedback);
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const setIntervalOriginal=globalThis.setInterval,clearIntervalOriginal=globalThis.clearInterval;
async function start(kind,row){
 await framework.dispose();
 Object.assign(state,{kind,create:row,observe:undefined,sent:[],images:[],calls:[],legacy:[],identities:0,next:0,timer:undefined,cleared:false,deferred:undefined,renderFail:false});
 globalThis.setInterval=(fn,delay)=>{assert.equal(delay,10000);state.timer=fn;return 123};globalThis.clearInterval=()=>{state.cleared=true};
 const e={name:row.private?'private.message.create':'message.create',UserId:'player',uid:1,MessageId:'payment-message',MessageText:row.input,isPrivate:row.private};
 await framework.run(handlers[kind], e, ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));
 return{sent:structuredClone(state.sent),images:structuredClone(state.images)};
}
async function tick(){await framework.invokeLast(async()=>{state.timer();for(let i=0;i<3;i++)await new Promise(resolve=>setImmediate(resolve));});}
const navigation = ['/充值', '/礼包奖励', '/新人返利', '/周周返利', '/我的资料', '/储物袋', '/我的权益', '/我的订单'];
function assertCheckout(actual, original, row) {
  assert.deepEqual(actual.images, original.images);
  let content = actual.sent;
  if (row.result?.success && row.result.data?.kind === 'checkout') {
    assert.equal(actual.sent.length, original.sent.length + 1);
    const view = inspectMessage(actual.sent[0]);
    const checkout = row.result.data.checkout;
    assert.ok(view.text.includes(checkout.packageName));
    assert.ok(view.text.includes(checkout.order.orderNo));
    assert.ok(view.text.includes((checkout.order.payAmount / 100).toFixed(2)));
    for (const command of [`/查询充值订单 ${checkout.order.orderNo}`, `/继续支付 ${checkout.order.orderNo}`, '/我的权益']) assert.ok(view.commands.includes(command));
    content = actual.sent.slice(1);
  }
  assert.deepEqual(rechargeBubbleSemantics(content, navigation), rechargeBubbleSemantics(original.sent, navigation), row.state + ' ' + row.input);
}
test('normal checkout retains original feedback, QR options, image props and removes the identity request',async()=>{
 try{
 for(const row of createRows.filter(r=>r.state!=='muted')){
  const actual=await start('current',row);assert.deepEqual(state.calls,[{operation:'normal.payment-create',args:row.arguments}]);assert.equal(state.identities,0);assert.equal(state.legacy.length,0);assert.equal(state.next,0);
  const original=await start('old',row);assertCheckout(actual, original, row);assert.equal(state.identities,1);assert.equal(state.legacy.length,row.status===0?0:1);
 }
 for(const row of createRows.filter(r=>r.state==='muted')){await start('current',row);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.timer,undefined);}
 const ready=createRows.find(r=>r.state==='ready'&&r.private&&r.status===201);
 const list=createRows.find(r=>r.state==='ready'&&r.private&&r.kind==='packages');
 const badList={...list,v1:{data:{packages:'invalid'}},result:{...list.result,data:{kind:'packages',packages:'invalid'}}};
 const listActual=await start('current',badList);assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assertCheckout(listActual,await start('old',badList),badList);

 for(const transport of [true,false]){
  const row={...ready,transport,v1:{data:{}},result:{...ready.result,data:{}}};
  const actual=await start('current',row);assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.timer,undefined);assert.equal(state.next,0);
  assertCheckout(actual,await start('old',row),row);
 }
 }finally{globalThis.setInterval=setIntervalOriginal;globalThis.clearInterval=clearIntervalOriginal;}
});
test('each observation uses one API including receipt and timeout, while preserving original successful and terminal replies',async()=>{
 const checkout=createRows.find(r=>r.state==='ready'&&r.private&&r.status===201);
 try{
 for(const row of observeRows.filter(r=>['PENDING','PAID','SUCCESS','FAILED','TIMEOUT','REFUND'].includes(r.state))){
  await start('current',checkout);state.observe=row;state.calls=[];state.sent=[];
  if(row.operation==='timeout')for(let i=0;i<29;i++){state.observe={...row,result:{...row.result,data:{...row.result.data,timedOut:false}}};await tick();}
  state.observe=row;state.calls=[];await tick();const actual=structuredClone(state.sent);assert.equal(state.calls.length,1);assert.equal(state.calls[0].operation,'normal.payment-'+row.operation);assert.equal(state.legacy.length,0);assert.equal(state.cleared,row.state==='SUCCESS'||!['PENDING','PAID'].includes(row.state)||row.operation==='timeout');
  await start('old',checkout);state.observe=row;state.sent=[];
  if(row.operation==='timeout')for(let i=0;i<29;i++)await tick();
  state.legacy=[];await tick();
  if (!['PENDING','PAID','SUCCESS'].includes(row.state)) {
    const view = inspectMessage(actual.flat());
    assert.ok(view.text.includes(`订单状态：${row.state}`));
    assert.ok(view.commands.includes('/我的权益')); assert.ok(view.commands.includes('/我的订单'));
  } else if (row.operation === 'timeout' && ['PENDING','PAID'].includes(row.state)) {
    const view = inspectMessage(actual.flat());
    const cancelled = row.result.data.cancelled;
    assert.ok(view.text.includes(cancelled ? '服务端已关闭待支付订单' : row.state === 'PAID' ? '已支付，奖励仍在处理中' : '订单关闭结果尚未确认'));
    if (!cancelled) assert.ok(!view.text.includes('订单已取消'));
    assert.ok(view.commands.includes('/我的订单'));
  } else assert.deepEqual(rechargeBubbleSemantics(actual, navigation), rechargeBubbleSemantics(state.sent, navigation), row.state + ' ' + row.operation);
  assert.equal(state.legacy.length,row.state==='SUCCESS'||row.operation==='timeout'&&['PENDING','PAID'].includes(row.state)?2:1);
 }
 for(const row of observeRows.filter(r=>r.state==='muted'||!r.result.success)){
  await start('current',checkout);state.observe=row;await tick();assert.equal(state.cleared,true);assert.equal(state.next,row.state==='muted'?1:0);assert.equal(state.sent.length,row.state==='muted'?2:3); // order metadata, image, optional error
 }
 // Slow observations cannot overlap and issue additional HTTP requests.
 await start('current',checkout);state.observe=observeRows.find(r=>r.state==='PENDING'&&r.operation==='state');let release;state.deferred=new Promise(resolve=>{release=resolve});state.calls=[];const pending=[framework.invokeLast(()=>state.timer()),framework.invokeLast(()=>state.timer())];await new Promise(resolve=>setImmediate(resolve));assert.equal(state.calls.length,1);release();await Promise.all(pending);
 }finally{globalThis.setInterval=setIntervalOriginal;globalThis.clearInterval=clearIntervalOriginal;}
});


test('package picker sends real receipt with each price and reward beside its original purchase action',async()=>{
 try {
  const list=createRows.find(r=>r.state==='ready'&&r.private&&r.kind==='packages');assert.ok(list);
  await start('current',list);
  const result=framework.result;assert.equal(result.messages.length,1);
  const message=result.messages[0];assert.equal(result.actions[message.actionIndex].results?.[0].code,ResultCode.Ok);
  const quotes=message.nodes.flatMap(n=>n.type==='Markdown'?n.value.filter(c=>c.type==='MD.blockquote'):[]);
  assert.equal(quotes.length,list.result.data.packages.length);
  for(const [index,pkg]of list.result.data.packages.entries()){
   const quote=quotes[index];assert.ok(Array.isArray(quote.value));
   const view=inspectMessage([{type:'Markdown',value:quote.value}]);
   assert.ok(view.text.includes(pkg.name));assert.ok(view.text.includes(`¥${pkg.yuan}`));
   assert.deepEqual(view.commands,[`/充值购买 ${pkg.id}`]);
   if(pkg.grantSpiritMilk>0)assert.ok(view.text.includes(`道晶 ${pkg.grantSpiritMilk}`));
   if(pkg.doubleAvailable)assert.ok(view.text.includes('首充双倍'));
  }
 }finally{globalThis.setInterval=setIntervalOriginal;globalThis.clearInterval=clearIntervalOriginal;}
});


test('paid result shows exact milk totals, equipment grants and navigation in a delivered bubble',async()=>{
 try {
  const checkout=createRows.find(r=>r.state==='ready'&&r.private&&r.status===201);assert.ok(checkout);
  const success=observeRows.find(r=>r.state==='SUCCESS'&&r.operation==='state');assert.ok(success);
  await start('current',checkout);state.sent=[];state.observe=structuredClone(success);
  const receipt=state.observe.result.data.receipt;
  receipt.packageRewards.equipments=[{name:'test reward equipment'}];
  await tick();
  const result=framework.result;assert.equal(result.messages.length,1);
  const message=result.messages[0];assert.equal(result.actions[message.actionIndex].results?.[0].code,ResultCode.Ok);
  const view=inspectMessage(message.nodes);
  assert.ok(view.text.includes(`道晶 +${receipt.packageRewards.spiritMilk+receipt.bonusSpiritMilk}`));
  assert.ok(view.text.includes('装备 ×1种'));
  assert.ok(view.commands.includes('/我的资料'));assert.ok(view.commands.includes('/储物袋'));
  assert.equal(view.text.match(/充值成功/g)?.length,1);
 }finally{globalThis.setInterval=setIntervalOriginal;globalThis.clearInterval=clearIntervalOriginal;}
});
