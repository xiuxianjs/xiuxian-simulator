import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
 const cwd = process.cwd();
 const directory = mkdtempSync(join(tmpdir(), 'flymail-routing-'));
 process.chdir(directory);
 t.after(() => {
  process.chdir(cwd);
  rmSync(directory, { recursive:true, force:true });
 });
 const old = process.env.login; process.env.login='qq-bot';
 t.after(() => { if(old===undefined) delete process.env.login; else process.env.login=old; });
 const app = createTestApp({config:{'qq-bot':{app_id:'123'},'xiuxian-game':{backend:{api_url:'http://offline.invalid',worker_token:'fixture'}}}});
 t.after(()=>app.dispose());
 const privateTarget = {platform:'qq-bot',BotId:'bot',scope:'c2c',targetId:'private-recipient'};
 const group = {platform:'qq-bot',BotId:'bot',scope:'group',targetId:'subscribed-group'};
 const state = {private:true, blocked:false, privateScope:'c2c', deliveryAllowed:true, subscribed:true};
 const requests:string[]=[];
 const queue:any[]=[];
 const acknowledgements:any[]=[];
 const subscriptionQueries:number[]=[];
 const receipts = new Map<string,unknown>();
 const leases = new Set<string>();
 t.mock.method(axios,'create',()=>({async post(path:string,body:any){
  requests.push(path);
  let data:unknown=null;
  if(path.endsWith('/claim')) { const i=queue.findIndex(row=>row.eventType===body.eventType && (body.lane==='flymail'?row.eventId.startsWith('flymail.message:'):body.lane==='standard'?!row.eventId.startsWith('flymail.message:'):true)); data={event:i<0?null:queue.splice(i,1)[0]}; }
  else if(path.endsWith('/delivery-check')) data={allowed:state.deliveryAllowed};
  else if (path.endsWith('/delivery-start')) data = { allowed: state.deliveryAllowed, token: 'a'.repeat(64) };
  else if (path.endsWith('/delivery-finish')) data = { ok: true };
  else if(path.endsWith('/ack')) acknowledgements.push(body);
  else if(path.endsWith('/legacy-sent-ids')) data={ids:[]};
  else if(path.endsWith('/player/categories')) data={enabled:true};
  else if(path.endsWith('/retry')) throw new Error(String(body.error));
  else if(path.endsWith('/private-target/read')) data=state.private?{...privateTarget,scope:state.privateScope}:null;
  else if(path.endsWith('/flymail/reminder/acquire')) {
   data={acquired:!leases.has(body.eventId)};
   leases.add(body.eventId);
  }
  else if(path.endsWith('/receipt/read')) data=receipts.get(body.eventId)??null;
  else if(path.endsWith('/receipt/store')) receipts.set(body.eventId,body.receipt);
  else if(path.endsWith('/subscription')) {
   subscriptionQueries.push(body.playerId);
   data=state.subscribed ? {
    platform:group.platform, channelId:group.targetId, botId:group.BotId, targetScope:group.scope,
    isEnabled:true, failureCount:0, lastDeliveryAt:null, lastError:null
   } : null;
  }
  else if(path.endsWith('/availability/read')) data={available:true,updatedAt:1};
  else if(path.endsWith('/permission/read')) data={state:{state:state.blocked?'blocked':'allowed',source:'event',updatedAt:1},raw:''};
  else if(!['/permission/cas','/permission/failure'].some(s=>path.endsWith(s))) throw new Error(`Unexpected API: ${path}`);
  return {data:{data}};
 }}));
 app.actions.on('message.send.target',()=>[createResult(ResultCode.Ok,'送达',{id:'receipt'})]);
 const run=(handler:()=>Promise<void>)=>app.runHandler(handler,app.events.groupMessage({platform:'qq-bot'}));
 return {app,run,state,requests,queue,acknowledgements,leases,subscriptionQueries};
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
test('私聊地址缺失时只在订阅群提醒收件人，不泄露正文、发送人或会话按钮',async t=>{
 const {run,state,requests,subscriptionQueries}=fixture(t);state.private=false;
 const result=await run(async()=>assert.deepEqual(await deliverFlyMailNotification('flymail.message:missing:received:7','recipient',content,true),{route:'group',reason:'reminded'}));
 assert.deepEqual(result.errors,[]); assert.equal(result.messages.length,1);
 assert.equal(result.messages[0].target?.targetId,'subscribed-group');
 assert.deepEqual(subscriptionQueries,[7]);
 assert.ok(!requests.some(path=>path.endsWith('/activity/candidates')));
 const view=inspectMessage(result.messages[0].nodes);
 assert.match(view.text,/你有新的飞信/);assert.doesNotMatch(view.text,/秘密|41|宗门|师门|队伍/);assert.deepEqual(view.commands,['/通知设置 flymail 关闭']);
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
});
test('飞信群提醒按收件人限频，冷却期间仍逐封尝试私聊', async t => {
 const {run,state,leases}=fixture(t);
 state.private=false;
 const result=await run(async()=>{
  const outcomes=await Promise.all([
   deliverFlyMailNotification('flymail.message:first:received:7','recipient',content,true),
   deliverFlyMailNotification('flymail.message:second:received:7','recipient',content,true)
  ]);
  assert.deepEqual(outcomes.map(outcome=>outcome.reason).sort(),['group_reminder_cooldown','reminded']);
  assert.equal((await deliverFlyMailNotification('flymail.message:other:received:8','other-recipient',content,true)).reason,'reminded');
  state.private=true;
  assert.deepEqual(await deliverFlyMailNotification('private-restored','recipient',content,true),{route:'private',reason:'sent'});
  state.private=false;
  leases.clear();
  assert.equal((await deliverFlyMailNotification('flymail.message:expired:received:7','recipient',content,true)).reason,'reminded');
 });
 assert.deepEqual(result.errors,[]);
 assert.deepEqual(result.messages.map(message=>message.target?.scope),['group','group','c2c','group']);
 assert.ok(result.messages.every(message=>result.actions[message.actionIndex].results?.[0].code===ResultCode.Ok));
});
test('私聊明确拒绝后只提醒；结果不确定时重试且不转发正文',async t=>{
 const {app,run}=fixture(t);
 app.actions.on('message.send.target',p=>p.payload.target.scope==='c2c'?[createResult(ResultCode.Fail,'拒绝')]:[createResult(ResultCode.Ok,'送达',{id:'reminder'})]);
 const result=await run(async()=>assert.equal((await deliverFlyMailNotification('flymail.message:refused:received:7','recipient',content,true)).reason,'reminded'));
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
  assert.deepEqual(await deliverFlyMailNotification('flymail.message:blocked:received:7','recipient',content,true),{route:'history',reason:'no_target'});
 });assert.deepEqual(result.errors,[]);assert.equal(result.messages.length,0);
});
test('私聊不可达且未订阅时只保留站内记录', async t => {
 const {run,state,requests,subscriptionQueries}=fixture(t);
 state.private=false;
 state.subscribed=false;
 const result=await run(async()=>{
  assert.deepEqual(await deliverFlyMailNotification('flymail.message:unsubscribed:received:7','recipient',content,true),{route:'history',reason:'no_target'});
 });
 assert.deepEqual(result.errors,[]);
 assert.equal(result.messages.length,0);
 assert.deepEqual(subscriptionQueries,[7]);
 assert.ok(!requests.some(path=>path.endsWith('/activity/candidates')||path.endsWith('/flymail/reminder/acquire')));
});

test('旧宗门师门订阅命令解释新规则，不再请求或保存指定群',async t=>{
 const {app,requests}=fixture(t);
 for(const text of ['/宗门群订阅','/师门群订阅','/取消宗门群订阅','/取消师门群订阅']) {
  const result=await app.runHandler(subscriptionHandler,app.events.groupMessage({text,platform:'qq-bot'}));
  assert.deepEqual(result.errors,[]);assert.equal(result.messages.length,1);
  const notice=inspectMessage(result.messages[0].nodes).text;
  assert.match(notice,/飞信正文只发私聊/);
  assert.match(notice,/仅在已开启通知订阅的群里发提醒/);
  assert.match(notice,/发送 \/飞信 查看站内记录/);
 }
 assert.equal(requests.length,0);
});

test('旧群地址或错误私聊缓存不能接收正文',async t=>{
 const {run,state}=fixture(t);state.privateScope='group';
 const result=await run(async()=>assert.equal((await deliverFlyMailNotification('flymail.message:invalid-address:received:7','GROUP:old-group',content,true)).reason,'reminded'));
 assert.deepEqual(result.errors,[]);assert.equal(result.messages.length,1);
 assert.doesNotMatch(inspectMessage(result.messages[0].nodes).text,/秘密|41/);
 assert.equal(result.messages[0].target?.targetId,'subscribed-group');
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

test('飞信任务合并同群收件人，正文保密，原事件分别确认', async t => {
  const {run,state,queue,acknowledgements} = fixture(t);
  state.private = false;
  t.mock.timers.enable({apis: ['setTimeout']});
  for (const [index,bid] of ['first-recipient','second-recipient','third-recipient'].entries()) {
    const uid = index + 7;
    queue.push({
      eventId: `flymail.message:${index + 1}:received:${uid}`,
      eventType: 'player.notification.dispatch',
      recipientUserId: uid,
      recipientBid: bid,
      payload: {version: 1, recipientUserId: uid, source: 'flymail.message.received', data: content}
    });
  }

  const result = await run(async () => {
    const delivery = PushMessageTask();
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(acknowledgements.length, 0);
    t.mock.timers.tick(2_000);
    await delivery;
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const [message] = result.messages;
  assert.equal(message.target?.targetId, 'subscribed-group');
  const mentions = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []).filter(node => node.type === 'MD.mention');
  assert.deepEqual(mentions.map(node => node.value), ['first-recipient','second-recipient','third-recipient']);
  const view = inspectMessage(message.nodes);
  assert.equal(view.text.match(/你有新的飞信/g)?.length, 1);
  assert.doesNotMatch(view.text, /秘密|41/);
  assert.deepEqual(view.commands, ['/通知设置 flymail 关闭', '/通知设置', '/我的通知']);
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  assert.equal(new Set(acknowledgements.map(row => row.eventId)).size, 3);
  assert.ok(acknowledgements.every(row => row.delivery.route === 'group'));
});

test('已领取的飞信在发送前发现角色注销，仅确认历史记录', async t => {
 const {run,state,queue,acknowledgements}=fixture(t);
 state.deliveryAllowed=false;
 queue.push({eventId:'flymail.message:retired:received:7',eventType:'player.notification.dispatch',recipientUserId:7,recipientBid:'recipient',
  payload:{version:1,recipientUserId:7,source:'flymail.message.received',data:content}});
 const result=await run(async()=>{await PushMessageTask();});
 assert.deepEqual(result.errors,[]);
 assert.equal(result.messages.length,0);
 assert.deepEqual(acknowledgements.map(row=>row.delivery),[{route:'history',reason:'no_target'}]);
});
