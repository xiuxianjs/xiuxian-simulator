import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, Router, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { switchBattleSkill, switchPassiveSkill, switchMysticSkill } from '../../src/response/skillBook/switch/res';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [{ type: '战技', handler: switchBattleSkill }, { type: '被动技', handler: switchPassiveSkill }, { type: '神通', handler: switchMysticSkill }];
const maximum = Object.fromEntries(['physicalAttack','magicAttack','physicalDefense','magicDefense','hp','physicalAttackPercent','magicAttackPercent','physicalDefensePercent','magicDefensePercent','hpPercent','speed','critRate','critDamage'].map(key => [key,1]));
for (const entry of entries) for (const isPrivate of [false,true]) {
  for (const wire of ['http','feedback','structured','malformed','wrong-type','internal']) {
    test(`switch recovery ${entry.type} ${wire} private=${isPrivate}`, async t => {
      const reason = '类型不匹配\n\n期望类型: '+entry.type+'\n实际类型: 其他类型';
      const { app, requests } = await gameFixture(t, request => wire==='http' ? { code:'INVALID', message:reason } : wire==='internal' ? {code:'INTERNAL',message:'private commit error'} : businessEnvelope(request.bid, wire==='malformed'?{}:wire==='wrong-type'?{code:'SHOW_LIST',skillType:'错误类型',options:[]}:undefined, wire==='malformed'||wire==='wrong-type'?[]:[{title:'',heading:'原抬头',text:reason,quote:'原引用',blocks:[{text:reason,quoted:false},{text:'原说明',quoted:true,inlineButtons:[{label:'原内联',command:'/丹方'}]}],buttons:[{label:'原返回',command:'/我'}],advice:wire==='structured'?[{command:'/我的功法',description:'原服务建议'}]:[]}]), wire==='http'?400:wire==='internal'?500:200);
      const command='/切换'+entry.type+' 0002';
      const event=isPrivate?app.events.privateMessage({text:command,platform:'qq-bot'}):app.events.groupMessage({text:command,platform:'qq-bot'});
      const result=await app.runHandler(entry.handler,event);const view=inspectMessage(result.messages[0].nodes);
      assert.equal(requests.length,1);assert.ok(requests[0].path.endsWith('/skill-books.switch'));assert.deepEqual(requests[0].body.arguments,{skillType:entry.type,bookId:'0002',confirm:null});assert.ok(requests[0].idempotencyKey);
      if(['malformed','wrong-type','internal'].includes(wire))assert.ok(view.text.includes('结果未获完整确认'));else assert.ok(view.text.includes(reason));
      if(['feedback','structured'].includes(wire)){for(const text of ['原抬头','原引用','原说明'])assert.ok(view.text.includes(text));for(const command of ['/我','/丹方'])assert.ok(view.commands.includes(command));}
      if(wire==='structured')assert.ok(view.text.includes('原服务建议'));
      assert.ok(view.commands.includes('/我的功法'));assert.ok(!view.commands.some(command=>/^\/切换/.test(command)));assert.ok(!view.text.includes('private commit'));
      assert.equal(result.messages[0].target?.targetId,isPrivate?event.UserId:event.ChannelId);assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
    });
  }
  for(const suffix of ['2 不确认','2 确认 多余','2 确认一下']){
    test(`invalid switch choice ${entry.type} ${suffix} private=${isPrivate}`,async t=>{
      const {app,requests}=await gameFixture(t,()=>{throw new Error('invalid confirmation must not request');});
      const text='/切换'+entry.type+' '+suffix;const result=await app.runHandler(entry.handler,isPrivate?app.events.privateMessage({text,platform:'qq-bot'}):app.events.groupMessage({text,platform:'qq-bot'}));const view=inspectMessage(result.messages[0].nodes);
      assert.equal(requests.length,0);assert.ok(view.text.includes('格式错误'));assert.ok(view.commands.includes('/我的功法'));assert.ok(!view.commands.some(command=>/^\/切换/.test(command)));assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
    });
  }
  for(const state of ['empty','in-use','choices','restricted','unsafe-id','zero-id','negative-id']){
    test(`switch selection ${entry.type} ${state} private=${isPrivate}`,async t=>{
      const options=state==='empty'?[]:[{id:state==='unsafe-id'?9007199254740992:state==='zero-id'?0:state==='negative-id'?-1:2,name:'当前功法',skillType:entry.type,status:state==='in-use'?3:2,isInUse:state==='in-use',canSwitch:state==='choices'||state==='unsafe-id'}];
      const {app,requests}=await gameFixture(t,request=>businessEnvelope(request.bid,{code:'SHOW_LIST',skillType:entry.type,options}));
      const text='/切换'+entry.type;const result=await app.runHandler(entry.handler,isPrivate?app.events.privateMessage({text,platform:'qq-bot'}):app.events.groupMessage({text,platform:'qq-bot'}));const view=inspectMessage(result.messages[0].nodes);
      assert.equal(requests.length,1);assert.deepEqual(requests[0].body.arguments,{skillType:entry.type,bookId:null,confirm:null});
      if(state.endsWith('-id'))assert.ok(view.text.includes('结果未获完整确认'));
      else if(state==='empty')assert.ok(view.text.includes('当前列表为空'));
      else {assert.ok(view.text.includes('当前功法'));if(state==='in-use')assert.ok(view.text.includes('没有其他可切换功法'));if(state==='restricted')assert.ok(view.text.includes('当前不可切换'));}
      assert.equal(view.commands.includes('/切换'+entry.type+' 2'),state==='choices');
      if(state!=='choices')assert.ok(!view.commands.some(command=>/^\/切换/.test(command)));
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
    });
  }
  for(const force of [false,true]){
    test(`switch authoritative result ${entry.type} force=${force} private=${isPrivate}`,async t=>{
      const resultData={outcome:force?'switched':'confirmation_required',skillBook:{id:2,name:'新功法',skillType:entry.type},oldSkillBook:{id:3,name:'旧功法',skillType:entry.type},targetMaximum:maximum,oldMaximum:maximum,comparisonLines:['服务端比较'],confirmationMessage:'旧功法 → 新功法，服务端比较'};
      const {app,requests}=await gameFixture(t,request=>businessEnvelope(request.bid,{code:'OK',skillType:entry.type,result:resultData}));
      const text='/切换'+entry.type+' 0002'+(force?' 确认':'');const result=await app.runHandler(entry.handler,isPrivate?app.events.privateMessage({text,platform:'qq-bot'}):app.events.groupMessage({text,platform:'qq-bot'}));const view=inspectMessage(result.messages[0].nodes);
      assert.equal(requests.length,1);assert.deepEqual(requests[0].body.arguments,{skillType:entry.type,bookId:'0002',confirm:force?'确认':null});
      if(force){assert.ok(view.text.includes('切换成功'));assert.ok(view.text.includes('旧功法'));assert.ok(!view.commands.some(command=>command.endsWith(' 确认')));}
      else{assert.ok(view.text.includes('尚未切换'));assert.doesNotMatch(view.text, /服务器重新检查/);assert.ok(view.commands.includes('/切换'+entry.type+' 2 确认'));}
      assert.ok(view.commands.includes('/我的功法'));assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);
    });
  }
}
for(const entry of entries){test(`switch actual router ${entry.type}`,async t=>{
  const {app,requests}=await gameFixture(t,request=>businessEnvelope(request.bid,{code:'SHOW_LIST',skillType:entry.type,options:[]}));
  const router=Router.create({events:['message.create','private.message.create']});router.use('切换'+entry.type,async()=>({default:entry.handler}));await app.mount({responseRouter:router.define});
  const event=app.events.groupMessage({text:'/切换'+entry.type,platform:'qq-bot'});const result=await app.dispatch(event);assert.equal(requests.length,1);assert.equal(result.messages.length,1);assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code,ResultCode.Ok);await app.dispatch({...event});assert.equal(requests.length,1);
});}
