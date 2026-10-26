import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import consume from '../../src/response/consume/res';
import App from '../../src/response-apps/consume/app';
import { businessEnvelope, gameFixture } from './fixture';
before(()=>mock.timers.enable({apis:['setTimeout']}));
after(async()=>{mock.timers.reset();await shutdownLogger();});
const entries=[{command:'/服用 精力丹 2',op:'items.consume',args:{itemName:'精力丹',quantity:2}},{command:'/炼化 0009 确认',op:'soul-artifacts.refine',args:{instanceId:9,confirmed:true}}];
const writes=/^\/(?:服用|消耗|炼化|确认培元丹|确认明悟丹)(?:\s|$)/;
for(const isPrivate of [false,true])for(const entry of entries)for(const wire of ['http','feedback','structured','malformed','internal']){
 test(`consume/refine recovery ${entry.op} ${wire} private=${isPrivate}`,async t=>{
  const reason='原业务拒绝';
  const {app,requests}=await gameFixture(t,request=>wire==='http'?{code:'CONFLICT',message:reason}:wire==='internal'?{code:'INTERNAL',message:'private commit failure'}:businessEnvelope(request.bid,wire==='malformed'?{}:undefined,wire==='malformed'?[]:[{title:'',heading:'原抬头',text:reason,quote:'原引用',blocks:[{text:reason,quoted:false},{text:'原说明',quoted:true,inlineButtons:[{label:'原内联',command:'/丹方'}]}],buttons:[{label:'原返回',command:'/我'}],advice:wire==='structured'?[{command:'/我的信息',description:'原服务建议'}]:[]}]),wire==='http'?409:wire==='internal'?500:200);
  const event=isPrivate?app.events.privateMessage({text:entry.command,platform:'qq-bot'}):app.events.groupMessage({text:entry.command,platform:'qq-bot'});
  const result=await app.runHandler(consume,event);const view=inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length,1);assert.ok(requests[0].path.endsWith('/'+entry.op));assert.deepEqual(requests[0].body.arguments,entry.args);assert.ok(requests[0].idempotencyKey);
  assert.ok(view.text.includes(wire==='malformed'||wire==='internal'?'使用结果未获完整确认':reason),view.text);
  if(['feedback','structured'].includes(wire)){for(const text of ['原抬头','原引用','原说明'])assert.ok(view.text.includes(text));for(const command of ['/我','/丹方'])assert.ok(view.commands.includes(command));assert.equal(view.text.split(reason).length-1,1);}
  if(wire==='structured')assert.ok(view.text.includes('原服务建议'));
  assert.ok(!view.text.includes('private commit'));assert.ok(!view.commands.some(command=>writes.test(command)));
  assert.ok(view.commands.includes(entry.op==='items.consume'?'/储物袋 道具':'/储物袋 本命')||wire==='structured');
  assert.equal(result.messages[0].target?.targetId,isPrivate?event.UserId:event.ChannelId);assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
 });
}
for(const isPrivate of [false,true])for(const command of ['/服用 精力丹 2abc','/服用 精力丹 1.5','/消耗 精力丹 2 多余','/服用 精力丹 9007199254740992','/炼化 9 不确认','/炼化 9 确认 多余','/炼化 9007199254740993','/炼化 0']){
 test(`ambiguous input never consumes ${command} private=${isPrivate}`,async t=>{
  const {app,requests}=await gameFixture(t,()=>{throw new Error('invalid input must not request');});
  const result=await app.runHandler(consume,isPrivate?app.events.privateMessage({text:command,platform:'qq-bot'}):app.events.groupMessage({text:command,platform:'qq-bot'}));const view=inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length,0);assert.ok(view.text.includes('参数错误'));assert.ok(view.commands.includes(command.includes('炼化')?'/储物袋 本命':'/储物袋 道具'));assert.ok(!view.commands.some(command=>writes.test(command)));assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
 });
}
for(const rawText of ['/服用 精力丹 1.5','/炼化 9 不确认'])test(`App guard also prevents bypass ${rawText}`,async()=>{
 let calls=0;const result=await App({uid:1,bid:'test',rawText,consume:async()=>{calls++;throw new Error('must not call');},refine:async()=>{calls++;throw new Error('must not call');}});
 assert.equal(calls,0);assert.equal(result.code,'FAIL');
});
const item=(id:number,name:string)=>({instanceId:id,name,gradeId:1,level:5,panels:[{key:'patk',value:10,isPercent:false}]});
const preview={found:true,needsConfirmation:true,target:item(9,'青莲'),current:item(8,'旧本命物'),refundQuantity:300,currentGradeName:'凡物',targetGradeName:'凡物',comparisonLines:['物攻 8 → 10'],refundLine:'预计返还筑灵石300'};
for(const isPrivate of [false,true])for(const state of ['preview','equipped','fallback-consumed','fallback-rejected']){
 test(`refine authoritative branch ${state} private=${isPrivate}`,async t=>{
  const noTarget={...preview,found:false,needsConfirmation:false,target:null,current:null,refundQuantity:0,currentGradeName:'',targetGradeName:'',comparisonLines:[],refundLine:''};
  const equipped={artifact:{id:9,artifactId:7,name:'青莲',category:'物理',gradeId:1,level:0,washCount:2,isEquipped:true,isListed:false},separated:{name:'旧本命物',previousLevel:5,refundQuantity:300}};
  const data=state.startsWith('fallback')?{preview:noTarget,equipped:null,consumed:{outcome:state==='fallback-consumed'?'consumed':'rejected',message:state==='fallback-consumed'?'道具已使用':'该道具当前不可使用',remainingQuantity:2}}:{preview,equipped:state==='equipped'?equipped:null,consumed:null};
  const {app,requests}=await gameFixture(t,request=>businessEnvelope(request.bid,data));
  const text='/炼化 0009'+(state==='equipped'?' 确认':'');
  const result=await app.runHandler(consume,isPrivate?app.events.privateMessage({text,platform:'qq-bot'}):app.events.groupMessage({text,platform:'qq-bot'}));const view=inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length,1);assert.deepEqual(requests[0].body.arguments,{instanceId:9,confirmed:state==='equipped'});
  if(state==='preview'){for(const value of ['尚未炼化','青莲','旧本命物','物攻 8 → 10','预计返还筑灵石300'])assert.ok(view.text.includes(value));assert.ok(view.commands.includes('/炼化 9 确认'));assert.ok(view.commands.includes('/本命物信息'));}
  else if(state==='equipped'){assert.ok(view.text.includes('成功炼化本命物'));assert.ok(view.text.includes('退还筑灵石×300'));assert.ok(!view.commands.includes('/炼化 9 确认'));}
  else if(state==='fallback-consumed'){assert.ok(view.text.includes('道具已使用'));assert.ok(view.text.includes('剩余数量: 2'));}
  else{assert.ok(view.text.includes('该道具当前不可使用'));assert.ok(view.commands.includes('/储物袋 本命'));assert.ok(!view.commands.some(command=>writes.test(command)));}
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
 });
}
for(const command of ['/服用','/服用 123','/服用 精力丹 0'])test(`usage remains non-consuming ${command}`,async t=>{
 const {app,requests}=await gameFixture(t,request=>businessEnvelope(request.bid,{usage:true}));const result=await app.runHandler(consume,app.events.groupMessage({text:command,platform:'qq-bot'}));const view=inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length,1);assert.deepEqual(requests[0].body.arguments,{mode:'usage'});assert.ok(view.commands.includes('/储物袋 道具'));assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
});
