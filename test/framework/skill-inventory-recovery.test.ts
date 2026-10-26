import assert from 'node:assert/strict';
import { after,before,mock,test } from 'node:test';
import { ResultCode,shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import learn from '../../src/response/skillBook/learn/res';
import decompose from '../../src/response/skillBook/decompose/res';
import upgrade from '../../src/response/skillBook/batchUpgrade/res';
import { businessEnvelope,gameFixture } from './fixture';
before(()=>mock.timers.enable({apis:['setTimeout']}));after(async()=>{mock.timers.reset();await shutdownLogger();});
const entries=[{handler:learn,op:'skill-books.learn',command:'/学习功法 0002',args:{bookId:'0002',confirm:null}},{handler:decompose,op:'skill-books.decompose',command:'/分解功法 0002',args:{bookId:'0002'}},{handler:upgrade,op:'skill-books.batch-upgrade',command:'/升级功法 0002 5',args:{bookId:'0002',count:'5'}}];
const writes=/^\/(?:学习功法|分解功法|升级功法|解锁)(?:\s|$)/;
for(const isPrivate of [false,true])for(const entry of entries)for(const wire of ['http','feedback','structured','malformed','internal']){
 test(`skill inventory recovery ${entry.op} ${wire} private=${isPrivate}`,async t=>{
  const reason='原业务拒绝';const {app,requests}=await gameFixture(t,request=>wire==='http'?{code:'CONFLICT',message:reason}:wire==='internal'?{code:'INTERNAL',message:'private commit failure'}:businessEnvelope(request.bid,wire==='malformed'?{}:undefined,wire==='malformed'?[]:[{title:'',heading:'原抬头',text:reason,quote:'原引用',blocks:[{text:reason,quoted:false},{text:'原说明',quoted:true,inlineButtons:[{label:'原内联',command:'/丹方'}]}],buttons:[{label:'原返回',command:'/我'}],advice:wire==='structured'?[{command:'/我的信息',description:'原服务建议'}]:[]}]),wire==='http'?409:wire==='internal'?500:200);
  const event=isPrivate?app.events.privateMessage({text:entry.command,platform:'qq-bot'}):app.events.groupMessage({text:entry.command,platform:'qq-bot'});const result=await app.runHandler(entry.handler,event);const view=inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length,1);assert.ok(requests[0].path.endsWith('/'+entry.op));assert.deepEqual(requests[0].body.arguments,entry.args);assert.ok(requests[0].idempotencyKey);assert.ok(view.text.includes(wire==='malformed'||wire==='internal'?'未获完整确认':reason),view.text);assert.ok(!view.text.includes('private commit'));
  if(['feedback','structured'].includes(wire)){for(const text of ['原抬头','原引用','原说明'])assert.ok(view.text.includes(text));for(const command of ['/我','/丹方'])assert.ok(view.commands.includes(command));}
  if(wire==='structured')assert.ok(view.text.includes('原服务建议'));assert.ok(!view.commands.some(command=>writes.test(command)));assert.equal(result.messages[0].target?.targetId,isPrivate?event.UserId:event.ChannelId);assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
 });
}
for(const isPrivate of [false,true])for(const [entry,text] of [[entries[0],'/学习功法 2 确认 多余'],[entries[0],'/学习功法 2 不确认'],[entries[1],'/分解功法 2 不分解'],[entries[1],'/分解功法 2abc'],[entries[1],'/分解功法 1.5'],[entries[1],'/分解功法 9007199254740993'],[entries[2],'/升级功法 2 1.5'],[entries[2],'/升级功法 2 2abc'],[entries[2],'/升级功法 2 3 多余']] as const){
 test(`invalid skill input does not mutate ${text} private=${isPrivate}`,async t=>{
  const {app,requests}=await gameFixture(t,()=>{throw new Error('invalid input must not request');});const result=await app.runHandler(entry.handler,isPrivate?app.events.privateMessage({text,platform:'qq-bot'}):app.events.groupMessage({text,platform:'qq-bot'}));const view=inspectMessage(result.messages[0].nodes);
  assert.equal(requests.length,0);assert.ok(view.text.includes('参数错误'));assert.ok(view.commands.includes(entry.op==='skill-books.batch-upgrade'?'/我的功法':'/储物袋 功法'));assert.ok(!view.commands.some(command=>writes.test(command)));assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
 });
}
const maximum=Object.fromEntries(['physicalAttack','magicAttack','physicalDefense','magicDefense','hp','physicalAttackPercent','magicAttackPercent','physicalDefensePercent','magicDefensePercent','hpPercent','speed','critRate','critDamage'].map(key=>[key,1]));
const book={id:2,name:'新功法',grade:'黄阶',realm:'炼气',gradeLevel:1,proficiency:0,skillType:'战技'};
for(const state of ['preview','learned','yes'])test(`learn original comparison/result ${state}`,async t=>{
 const data=state==='preview'?{outcome:'confirmation_required',skillBook:book,oldSkillBook:{...book,id:3,name:'旧功法'},targetMaximum:maximum,oldMaximum:maximum}:{outcome:'learned',skillBook:book};
 const {app,requests}=await gameFixture(t,request=>businessEnvelope(request.bid,data));const result=await app.runHandler(learn,app.events.privateMessage({text:'/学习功法 0002'+(state==='yes'?' YES':''),platform:'qq-bot'}));const view=inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length,1);assert.deepEqual(requests[0].body.arguments,{bookId:'0002',confirm:state==='yes'?'YES':null});assert.ok(view.text.includes('新功法'));if(state==='preview'){assert.ok(view.text.includes('尚未替换'));assert.ok(view.commands.includes('/学习功法 2 确认'));assert.ok(view.commands.includes('/我的功法'));}else assert.ok(view.text.includes('学习成功'));assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
});
test('decompose preserves committed refund and does not offer repeating deletion',async t=>{
 const data={instanceId:2,name:'新功法',skillType:'战技',grade:'黄阶',realm:'炼气',refundExp:2000,baseExp:2000,refundedItems:[{itemId:1,name:'功法残页',quantity:2,expValue:1000}]};const {app,requests}=await gameFixture(t,request=>businessEnvelope(request.bid,data));const result=await app.runHandler(decompose,app.events.groupMessage({text:'/分解功法 2',platform:'qq-bot'}));const view=inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length,1);for(const text of ['分解成功','2000','功法残页 x2','1000经验/个'])assert.ok(view.text.includes(text));assert.ok(!view.commands.some(command=>writes.test(command)));assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
});
for(const successes of [0,2,5])test(`upgrade retains actual partial settlement ${successes}/5`,async t=>{
 const data={mode:'execute',result:{outcome:'ok',target:{id:2,name:'青莲功'},skillBookId:2,upgradeCount:5,successCount:successes,totalConsumedExp:successes*200,totalConsumedSpiritStone:successes*20,lastUpgradeCount:successes,attributeChanges:[],attributeLines:['原属性变化'],stopReason:successes<5?'灵石不足':'已达指定次数（5次）'}};
 const {app,requests}=await gameFixture(t,request=>businessEnvelope(request.bid,data));const result=await app.runHandler(upgrade,app.events.privateMessage({text:'/升级功法 2 5',platform:'qq-bot'}));const view=inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length,1);if(successes>0){assert.ok(view.text.includes(`连续升级 ${successes} 次`));assert.ok(view.text.includes(`消耗经验: ${successes*200}`));assert.ok(view.text.includes(`消耗灵石: ${successes*20}`));}else assert.ok(view.text.includes('无法升级'));
 assert.equal(view.commands.includes('/升级功法 2 5'),successes===5);if(successes<5)assert.ok(view.text.includes('灵石不足'));assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
});
for(const id of ['0002','9007199254740993'])test(`upgrade count chooser avoids invalid synthesized IDs ${id}`,async t=>{
 const {app,requests}=await gameFixture(t,request=>businessEnvelope(request.bid,{mode:'choose',bookId:id}));const result=await app.runHandler(upgrade,app.events.groupMessage({text:'/升级功法 2 选择',platform:'qq-bot'}));const view=inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length,1);if(id==='0002'){for(const n of [1,5,10])assert.ok(view.commands.includes(`/升级功法 ${id} ${n}`));}else{assert.ok(view.text.includes('未获完整确认'));assert.ok(!view.commands.some(command=>writes.test(command)));}assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
});

for (const isPrivate of [false, true]) for (const [reason, expected, commands] of [
 ['该功法已经学习', '该实例已学，无需再购买或重复学习', ['/我的功法']],
 ['功法正在使用中，无法替换\n\n使用中: 【旧破军】【战技】\n\n💡请先使用 /换下战技 卸下功法后再替换', '换下后重新比较目标与返还', ['/我的功法']],
 ['当前待学功法品级低于已学功法\n\n已学：【旧破军】【上品】【炼气】\n待学：【新破军】【下品】【炼气】', '确认文字不能绕过此限制', ['/我的功法', '/储物袋 功法']]
] as const) test(`learning refusal gives specific next step ${reason.split('\n')[0]} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [{ label: '原储物袋', command: '/我的储物袋 功法' }], advice: [] }]));
 const event = isPrivate ? app.events.privateMessage({ text: '/学习功法 2 确认', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/学习功法 2 确认', platform: 'qq-bot' });
 const result = await app.runHandler(learn, event);
 const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1);
 assert.deepEqual(requests[0].body.arguments, { bookId: '2', confirm: '确认' });
 assert.ok(requests[0].idempotencyKey);
 assert.ok(view.text.includes(reason.split('\n')[0]), view.text); assert.ok(view.text.includes(expected));
 for (const command of [...commands, '/我的储物袋 功法', '/我', '/属性面板']) assert.ok(view.commands.includes(command), command);
 assert.ok(!view.commands.some(command => /^\/(?:学习功法|分解功法|升级功法|换下|解锁)/.test(command)));
 assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId);
 assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
