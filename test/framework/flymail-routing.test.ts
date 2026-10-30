import assert from 'node:assert/strict';
import { after, test, type TestContext } from 'node:test';
import axios from 'axios';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { PushMessageTask } from '../../src/task/pushMessageTask';
import { deliverFlyMailNotification } from '../../src/notification/flymailDelivery';
import { NotificationDeliveryUncertainError } from '../../src/types/notification';
import subscriptionHandler from '../../src/response/flyMail/guildSubscription/res';

after(() => shutdownLogger());
const content = [{ type: 'Text' as const, value: '【秘密发送人】秘密正文，会话号41' }];
function fixture(t: TestContext) {
 const old = process.env.login; process.env.login='qq-bot';
 t.after(() => { if(old===undefined) delete process.env.login; else process.env.login=old; });
 const app = createTestApp({config:{'qq-bot':{app_id:'123'},'xiuxian-game':{backend:{api_url:'http://offline.invalid',worker_token:'fixture'}}}});
 t.after(()=>app.dispose());
 const privateTarget = {platform:'qq-bot',BotId:'bot',scope:'c2c',targetId:'private-recipient'};
 const group = {platform:'qq-bot',BotId:'bot',scope:'group',targetId:'active-group'};
 const state = {private:true, blocked:false, privateScope:'c2c'};
 const requests:string[]=[];
 const queue:any[]=[];
 const acknowledgements:any[]=[];
 const receipts = new Map<string,unknown>();
 t.mock.method(axios,'create',()=>({async post(path:string,body:any){
  requests.push(path);
  let data:unknown=null;
  if(path.endsWith('/claim')) { const i=queue.findIndex(row=>row.eventType===body.eventType && (body.lane==='flymail'?row.eventId.startsWith('flymail.message:'):body.lane==='standard'?!row.eventId.startsWith('flymail.message:'):true)); data={event:i<0?null:queue.splice(i,1)[0]}; }
  else if(path.endsWith('/ack')) acknowledgements.push(body);
  else if(path.endsWith('/legacy-sent-ids')) data={ids:[]};
  else if(path.endsWith('/player/categories')) data={enabled:true};
  else if(path.endsWith('/retry')) throw new Error(String(body.error));
  else if(path.endsWith('/private-target/read')) data=state.private?{...privateTarget,scope:state.privateScope}:null;
  else if(path.endsWith('/receipt/read')) data=receipts.get(body.eventId)??null;
  else if(path.endsWith('/receipt/store')) receipts.set(body.eventId,body.receipt);
  else if(path.endsWith('/activity/candidates')) data=[{target:group,occurredAt:100}];
  else if(path.endsWith('/availability/read')) data={available:true,updatedAt:1};
  else if(path.endsWith('/permission/read')) data={state:{state:state.blocked?'blocked':'allowed',source:'event',updatedAt:1},raw:''};
  else if(!['/permission/cas','/permission/failure'].some(s=>path.endsWith(s))) throw new Error(`Unexpected API: ${path}`);
  return {data:{data}};
 }}));
 app.actions.on('message.send.target',()=>[createResult(ResultCode.Ok,'送达',{id:'receipt'})]);
 const run=(handler:()=>Promise<void>)=>app.runHandler(handler,app.events.groupMessage({platform:'qq-bot'}));
 return {app,run,state,requests,queue,acknowledgements};
}
for(const scope of ['friend','companion','guild','master','team']) {
 test(`${scope} 正文只到各自收件人私聊，不读取个人或组织订阅群`,async t=>{
  const {run,requests}=fixture(t);
  const result=await run(async()=>assert.deepEqual(await deliverFlyMailNotification(`flymail.message:${scope}`, 'recipient',content,true),{route:'private',reason:'sent'}));
  assert.deepEqual(result.errors,[]); assert.equal(result.messages.length,1);
  assert.equal(result.messages[0].target?.scope,'c2c');
  assert.match(inspectMessage(result.messages[0].nodes).text,/秘密正文/);
  assert.ok(!requests.some(p=>p.endsWith('/subscription')||p.endsWith('/activity/candidates')));
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
 });
}
test('私聊地址缺失时活跃群仅提醒收件人，不泄露正文、发送人或会话按钮',async t=>{
 const {run,state}=fixture(t);state.private=false;
 const result=await run(async()=>assert.deepEqual(await deliverFlyMailNotification('missing','recipient',content,true),{route:'group',reason:'reminded'}));
 assert.deepEqual(result.errors,[]); assert.equal(result.messages.length,1);
 assert.equal(result.messages[0].target?.targetId,'active-group');
 const view=inspectMessage(result.messages[0].nodes);
 assert.match(view.text,/你有新的飞信/);assert.doesNotMatch(view.text,/秘密|41|宗门|师门|队伍/);assert.deepEqual(view.commands,[]);
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
});
test('私聊明确拒绝后只提醒；结果不确定时重试且不转发正文',async t=>{
 const {app,run}=fixture(t);
 app.actions.on('message.send.target',p=>p.payload.target.scope==='c2c'?[createResult(ResultCode.Fail,'拒绝')]:[createResult(ResultCode.Ok,'送达',{id:'reminder'})]);
 const result=await run(async()=>assert.equal((await deliverFlyMailNotification('refused','recipient',content,true)).reason,'reminded'));
 assert.deepEqual(result.errors,[]);
 const publicMessages=result.messages.filter(m=>m.target?.scope==='group');assert.equal(publicMessages.length,1);
 assert.doesNotMatch(inspectMessage(publicMessages[0].nodes).text,/秘密|41/);
 app.actions.on('message.send.target',()=>[]);
 const uncertain=await run(async()=>{await assert.rejects(deliverFlyMailNotification('uncertain','recipient',content,true),NotificationDeliveryUncertainError);});
 assert.deepEqual(uncertain.errors,[]);assert.ok(!uncertain.messages.some(m=>m.target?.scope==='group'));
});
test('关闭主动消息或全部通道不可达仅留站内；不向祖师爷、宗主转发',async t=>{
 const {run,state}=fixture(t);state.private=false;state.blocked=true;
 const result=await run(async()=>{
  assert.deepEqual(await deliverFlyMailNotification('disabled','recipient',content,false),{route:'history',reason:'proactive_disabled'});
  assert.deepEqual(await deliverFlyMailNotification('blocked','recipient',content,true),{route:'history',reason:'no_target'});
 });assert.deepEqual(result.errors,[]);assert.equal(result.messages.length,0);
});
test('旧宗门师门订阅命令解释新规则，不再请求或保存指定群',async t=>{
 const {app,requests}=fixture(t);
 for(const text of ['/宗门群订阅','/师门群订阅','/取消宗门群订阅','/取消师门群订阅']) {
  const result=await app.runHandler(subscriptionHandler,app.events.groupMessage({text,platform:'qq-bot'}));
  assert.deepEqual(result.errors,[]);assert.equal(result.messages.length,1);assert.match(inspectMessage(result.messages[0].nodes).text,/统一私聊投递/);
 }
 assert.equal(requests.length,0);
});

test('旧群地址或错误私聊缓存不能接收正文',async t=>{
 const {run,state}=fixture(t);state.privateScope='group';
 const result=await run(async()=>assert.equal((await deliverFlyMailNotification('invalid-address','GROUP:old-group',content,true)).reason,'reminded'));
 assert.deepEqual(result.errors,[]);assert.equal(result.messages.length,1);
 assert.doesNotMatch(inspectMessage(result.messages[0].nodes).text,/秘密|41/);
 assert.equal(result.messages[0].target?.targetId,'active-group');
});

test('真实任务忽略旧组织群和管理员路由，旧告警不再转发，逐条确认隐私投递',async t=>{
 const {run,queue,acknowledgements}=fixture(t);
 for(const scope of ['friend','companion','guild','master','team']) queue.push({eventId:`flymail.message:${scope}:received:7`,eventType:'player.notification.dispatch',recipientUserId:7,recipientBid:'recipient',
 flymailRouting:{scope:'master',messageId:99,group:{platform:'qq-bot',scope:'group',targetId:'forbidden-group'},administrator:{userId:9,bid:'forbidden-admin'},members:[{userId:9,bid:'forbidden-admin'}]},
 payload:{version:1,recipientUserId:7,source:'flymail.message.received',data:content}});
 queue.push({eventId:'flymail.subscription.required:99',eventType:'player.notification.dispatch',recipientUserId:9,recipientBid:'forbidden-admin',payload:{version:1,recipientUserId:9,source:'flymail.subscription.required',data:content}});
 const result=await run(async()=>{await PushMessageTask();});
 assert.deepEqual(result.errors,[]);assert.equal(acknowledgements.length,6);assert.ok(result.messages.length>0);
 for(const message of result.messages) {
  assert.equal(message.target?.scope,'c2c');assert.equal(message.target?.targetId,'private-recipient');
  assert.equal(result.actions[message.actionIndex].results?.[0].code,ResultCode.Ok);
 }
 const old=acknowledgements.find(row=>row.eventId==='flymail.subscription.required:99');assert.equal(old.delivery.route,'history');
});
