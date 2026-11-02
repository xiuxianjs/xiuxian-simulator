import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestApp } from 'alemonjs/testing';
import { Expose } from 'alemonjs';
import { beginGamePresentation } from '../../src/utils/gamePresentation.ts';
import { gameGuidance } from '../../src/agent-play/game-guidance.ts';
const schema = {type:'object',additionalProperties:false,properties:{presentation:{type:'object',additionalProperties:false,properties:{protocol:{type:'string',enum:['system-guide.v1']}}}}};
test('manual progress discards stale advice but preserves committed receipts and rejects further old actions', async () => {
 const app=createTestApp();
 try {

  const game=Expose.create().provide({name:'xiuxian.player.v1',description:'test',version:'1',actions:{get_onboarding:Expose.action({description:'view',effect:'read',inputSchema:{type:'object',additionalProperties:false,properties:{}},outputSchema:schema,handler:async()=>({})}),perform_onboarding_action:Expose.action({description:'action',effect:'write',inputSchema:{type:'object',additionalProperties:false,properties:{}},outputSchema:schema,handler:async()=>({})})}});
  await app.mount({expose:game},undefined,'xiuxian-game');
  const e=app.events.groupMessage({userId:'player',text:'怎么玩',platform:'qq-bot'});
  const result=await app.invoke(e,async()=>{
   let calls=0;
   const tools=[{name:'expose_write',execute:async args=>{calls++;return {ok:true,data:{success:true,branch:'business',presentation:{protocol:'system-guide.v1',delivery:'pending',text:args.action==='get_onboarding'?'旧目录':'原签到奖励回执'}}};}}];
   const guide=gameGuidance(tools);
   const args=action=>({protocol:'xiuxian.player.v1',provider:'xiuxian-game',action,argumentsJson:'{}'});
   await tools[0].execute(args('get_onboarding'),{});
   await tools[0].execute(args('perform_onboarding_action'),{});
   await beginGamePresentation(e);
   assert.equal(guide.isStale(),true);
   const text=guide.append('先起道号');
   assert.ok(text.includes('原签到奖励回执'));
   assert.ok(!text.includes('旧目录')&&!text.includes('先起道号'));
   assert.equal((await tools[0].execute(args('perform_onboarding_action'),{})).ok,false);
   assert.equal(calls,2);
  },'xiuxian-game');
  assert.deepEqual(result.errors,[]);
 } finally {await app.dispose();}
});
