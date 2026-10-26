import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, Router, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import confirm from '../../src/response/peiyuanDan/confirm/res';
import cancel from '../../src/response/peiyuanDan/cancel/res';
import mingwu from '../../src/response/mingwudan/confirm/res';
import { businessEnvelope, gameFixture } from './fixture';
before(()=>mock.timers.enable({apis:['setTimeout']}));after(async()=>{mock.timers.reset();await shutdownLogger();});
const entries=[{handler:confirm,op:'peiyuan.confirm',command:'/确认培元丹',args:{}},{handler:cancel,op:'peiyuan.cancel',command:'/取消培元丹',args:{}},{handler:mingwu,op:'mingwu.confirm',command:'/确认明悟丹 7 3',args:{skillBookId:7,quantity:3}}];
const write=/^\/(?:确认培元丹|取消培元丹|确认明悟丹|服用)(?:\s|$)/;
for(const isPrivate of [false,true])for(const entry of entries)for(const wire of ['http','feedback','structured','malformed','internal']){
 test(`pill recovery ${entry.op} ${wire} private=${isPrivate}`,async t=>{
  const reason='原业务拒绝';const {app,requests}=await gameFixture(t,request=>wire==='http'?{code:'CONFLICT',message:reason}:wire==='internal'?{code:'INTERNAL',message:'private commit failure'}:businessEnvelope(request.bid,wire==='malformed'?{}:undefined,wire==='malformed'?[]:[{title:'',heading:'原抬头',text:reason,quote:'原引用',blocks:[{text:reason,quoted:false},{text:'原说明',quoted:true,inlineButtons:[{label:'原内联',command:'/丹方'}]}],buttons:[{label:'原返回',command:'/我'}],advice:wire==='structured'?[{command:'/我的信息',description:'原服务建议'}]:[]}]),wire==='http'?409:wire==='internal'?500:200);
  const event=isPrivate?app.events.privateMessage({text:entry.command,platform:'qq-bot'}):app.events.groupMessage({text:entry.command,platform:'qq-bot'});const result=await app.runHandler(entry.handler,event);const view=inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length,1);assert.ok(requests[0].path.endsWith('/'+entry.op));assert.deepEqual(requests[0].body.arguments,entry.args);assert.ok(requests[0].idempotencyKey);
  assert.ok(view.text.includes(wire==='malformed'||wire==='internal'?'未获完整确认':reason),view.text);assert.ok(!view.text.includes('private commit'));
  if(['feedback','structured'].includes(wire)){for(const text of ['原抬头','原引用','原说明'])assert.ok(view.text.includes(text),view.text);for(const command of ['/我','/丹方'])assert.ok(view.commands.includes(command));}
  if(wire==='structured')assert.ok(view.text.includes('原服务建议'));
  assert.ok(view.commands.includes('/储物袋 道具 丹药')||wire==='structured');assert.ok(!view.commands.some(command=>write.test(command) && command !== '/服用 明悟丹 1'));
  assert.equal(result.messages[0].target?.targetId,isPrivate?event.UserId:event.ChannelId);assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
 });
}
const refusals=[{entry:0,text:'没有待确认的培元丹效果',hint:'可能已过期或已处理'},{entry:1,text:'没有待确认的培元丹效果',hint:'取消或超时不返还'},{entry:0,text:'操作繁忙，请稍后重试',hint:'失败提示不证明'},{entry:2,text:'未找到该功法，请确认功法已装备',hint:'先查看并装备'},{entry:2,text:'今日明悟丹使用次数已达上限(10/10)',hint:'待次数恢复后再服用'},{entry:2,text:'今日明悟丹剩余2次，无法服用3颗',hint:'减少本次服用数量'}];
for(const refusal of refusals)for(const wire of ['http','feedback'])for(const isPrivate of [false,true]){
 test(`pill refusal ${refusal.text} ${wire} private=${isPrivate}`,async t=>{
  const entry=entries[refusal.entry];const {app,requests}=await gameFixture(t,request=>wire==='http'?{code:'CONFLICT',message:refusal.text}:businessEnvelope(request.bid,undefined,[{title:'',heading:'',text:refusal.text,buttons:[],advice:[]}]),wire==='http'?409:200);
  const result=await app.runHandler(entry.handler,isPrivate?app.events.privateMessage({text:entry.command,platform:'qq-bot'}):app.events.groupMessage({text:entry.command,platform:'qq-bot'}));const view=inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length,1);assert.ok(view.text.includes(refusal.text));assert.ok(view.text.includes(refusal.hint),view.text);if(refusal.text.includes('未找到该功法')){assert.ok(view.commands.includes('/服用 明悟丹 1'));assert.ok(view.text.includes('功法模板编号'));}assert.ok(!view.commands.some(command=>write.test(command) && command !== '/服用 明悟丹 1'));assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
 });
}
for(const isPrivate of [false,true])for(const [entry,command] of [[entries[0],'/确认培元丹 不确认'],[entries[0],'/确认培元丹 2'],[entries[1],'/取消培元丹 abc'],[entries[2],'/确认明悟丹 7abc 3'],[entries[2],'/确认明悟丹 7 1.5'],[entries[2],'/确认明悟丹 7 3 多余'],[entries[2],'/确认明悟丹 9007199254740993 1']] as const){
 test(`invalid pill confirmation never consumes ${command} private=${isPrivate}`,async t=>{
  const {app,requests}=await gameFixture(t,()=>{throw new Error('must not submit invalid choice');});const result=await app.runHandler(entry.handler,isPrivate?app.events.privateMessage({text:command,platform:'qq-bot'}):app.events.groupMessage({text:command,platform:'qq-bot'}));const view=inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length,0);assert.ok(view.text.includes('参数错误'));assert.ok(!view.commands.some(command=>write.test(command) && command !== '/服用 明悟丹 1'));assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
 });
}
const changed={changes:[{attribute:'strength',attributeName:'力量',oldValue:2,newValue:5,change:3}]};
const mingwuData={message:'原参悟结算',proficiencyGain:3,currentProficiency:40,skillBookName:'青莲功',remainingCount:7,consumedCount:3,guidanceText:'原成长指引',canContinue:true};
const successCases=[{entry:0,state:'changed',data:changed},{entry:0,state:'empty',data:{changes:[]}},{entry:0,state:'nil',data:{changes:null}},{entry:1,state:'cancelled',data:{outcome:'cancelled',pendingJson:'{}',message:'已取消，2颗培元丹不返还'}},{entry:1,state:'not_pending',data:{outcome:'not_pending',pendingJson:null,message:'没有待确认的培元丹效果'}},{entry:2,state:'full',data:mingwuData},{entry:2,state:'partial',data:{...mingwuData,consumedCount:1,currentProficiency:60,remainingCount:9}},{entry:2,state:'low-remaining',data:{...mingwuData,remainingCount:2}}];
for(const isPrivate of [false,true])for(const sample of successCases){
 test(`pill result facts ${sample.state} private=${isPrivate}`,async t=>{
  const entry=entries[sample.entry];const {app,requests}=await gameFixture(t,request=>businessEnvelope(request.bid,sample.data));const result=await app.runHandler(entry.handler,isPrivate?app.events.privateMessage({text:entry.command,platform:'qq-bot'}):app.events.groupMessage({text:entry.command,platform:'qq-bot'}));const view=inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length,1);
  if(sample.state==='changed'){assert.ok(view.text.includes('原预览变化回执'));assert.ok(view.text.includes('力量：2 → 5（+3）'));assert.ok(view.commands.includes('/属性面板'));}
  else if(sample.state==='empty'||sample.state==='nil'){assert.ok(view.text.includes('本次没有属性变化'));assert.ok(!view.text.includes('undefined'));assert.ok(!view.commands.includes('/服用 培元丹 1'));}
  else if(sample.state==='cancelled')assert.ok(view.text.includes('2颗培元丹不返还'));
  else if(sample.state==='not_pending'){assert.ok(view.text.includes('没有待确认'));assert.ok(!view.text.includes('效果已取消'));assert.ok(!view.commands.some(command=>write.test(command) && command !== '/服用 明悟丹 1'));}
  else {for(const text of ['青莲功','原成长指引','原参悟结算'])assert.ok(view.text.includes(text));assert.equal(view.commands.includes('/确认明悟丹 7 3'),sample.state==='full');if(sample.state!=='full')assert.ok(view.text.includes('条件已变化'));}
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
 });
}
for(const entry of entries){test(`pill actual router and duplicate ${entry.op}`,async t=>{
 const data=entry.op==='peiyuan.confirm'?changed:entry.op==='peiyuan.cancel'?successCases[3].data:mingwuData;
 const {app,requests}=await gameFixture(t,request=>businessEnvelope(request.bid,data));const router=Router.create({events:['message.create','private.message.create']});router.use(entry.command.split(' ')[0].slice(1),async()=>({default:entry.handler}));await app.mount({responseRouter:router.define});
 const event=app.events.groupMessage({text:entry.command,platform:'qq-bot'});const result=await app.dispatch(event);assert.equal(requests.length,1);assert.equal(result.messages.length,1);assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);await app.dispatch({...event});assert.equal(requests.length,1);
});}
