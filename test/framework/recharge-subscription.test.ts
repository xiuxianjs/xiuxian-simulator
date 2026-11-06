import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createServer } from 'node:http';
import { shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';

after(shutdownLogger);
test('recharge subscription uses real private handler and authenticated bot identity', async t => {
 const calls: Record<string, unknown>[] = [];
 const server = createServer(async (req,res) => {
  let raw=''; for await(const chunk of req) raw+=chunk;
  if(req.url==='/api/channel/v1/robot/recharge-subscription') calls.push(JSON.parse(raw));
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify({data: req.url==='/api/channel/v1/robot/recharge-subscription' ? {notice:'已订阅本机器人后续成功充值。'} : null}));
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise<void>(resolve=>server.close(()=>resolve())));
 const address=server.address();if(!address||typeof address==='string')throw Error('missing address');
 const origin=`http://127.0.0.1:${address.port}`;
 const app=createTestApp({config:{master_id:['owner'],processor:{repeated_user_time:0},'qq-bot':{app_id:'123'},'xiuxian-game':{support_api_origin:origin,backend:{channel_mode:true,api_url:origin,robot_auth_token:'cb1_'+'a'.repeat(43)}}}});
 t.after(()=>app.dispose());
 await app.mount({responseRouter:app.run(createGameRouter).router});
 const event=app.events.privateMessage({text:'/订阅充值',platform:'qq-bot'},{BotId:'123',UserId:'owner',MessageId:'subscribe-1',Target:{BotId:'123',scope:'c2c',targetId:'owner'}});
 const result=await app.dispatch(event);
 assert.deepEqual(result.errors,[]);
 assert.equal(calls.length,1);
 assert.equal(calls[0].appId,'123');
 assert.equal(calls[0].userId,'owner');
 assert.equal(calls[0].action,'subscribe');
 assert.equal(calls[0].localMaster,true);
 assert.equal(result.messages.length,1);
 assert.match(JSON.stringify(result.messages[0].nodes),/已订阅/);
});
