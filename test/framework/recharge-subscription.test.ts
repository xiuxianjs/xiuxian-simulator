import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { createServer } from 'node:http';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';
import { pollRechargeSubscriptions } from '../../src/api/bot/recharge-subscription';

after(shutdownLogger);

test('充值轮询只为有待处理回执的订阅者读地址，地址不可用时保留待发记录', async t => {
  const calls: string[] = [];
  let pending = false;
  let targetUnavailable = false;
  let claimId: string | undefined;
  let sends = 0;
  let acknowledgments = 0;
  const server = createServer(async (req, res) => {
    const body = JSON.parse(Buffer.concat(await Array.fromAsync(req)).toString());
    res.setHeader('Content-Type', 'application/json');
    if (req.url?.endsWith('/robot/recharge-subscription')) {
      calls.push(body.action);
      if (body.action === 'users') {
        assert.equal(body.pendingOnly, true);
        res.end(JSON.stringify({ data: { prepareSupported: true, users: pending ? ['owner'] : [] } }));
      } else if (body.action === 'poll') {
        assert.equal(body.userId, 'owner');
        assert.equal(body.prepareOnly, true);
        res.end(JSON.stringify({ data: { deliveries: [{ key: 'fixture', content: '已充值' }] } }));
      } else if (body.action === 'start') {
        assert.equal(body.key, 'fixture');
        assert.equal(sends, 0);
        if (!claimId) {
          claimId = body.claimId;
          assert.match(claimId ?? '', /^[0-9a-f-]{36}$/);
          res.statusCode = 503;
          res.end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE' } }));
        } else {
          assert.equal(body.claimId, claimId);
          res.end(JSON.stringify({ data: { started: true } }));
        }
      } else {
        assert.equal(body.action, 'ack');
        assert.equal(body.claimId, claimId);
        assert.equal(body.status, 'sent');
        if (++acknowledgments === 1) {
          res.statusCode = 503;
          res.end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE' } }));
        } else {
          res.end(JSON.stringify({ data: { ok: true } }));
        }
      }
      return;
    }
    assert.ok(req.url?.endsWith('/private-target/read'));
    assert.equal(body.bid, 'owner');
    assert.equal(body.botId, '123');
    calls.push('private-target');
    if (targetUnavailable) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE' } }));
      return;
    }
    res.end(JSON.stringify({ data: { platform: 'qq-bot', BotId: '123', scope: 'c2c', targetId: 'private-address' } }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  const app = createTestApp({ config: {
    'qq-bot': { app_id: '123' },
    'xiuxian-game': { support_api_origin: origin, backend: { channel_mode: true, api_url: origin, robot_auth_token: 'fixture' } }
  } });
  t.after(() => app.dispose());
  app.actions.on('message.send.target', () => {
    sends++;
    return [createResult(ResultCode.Ok, 'sent', { id: 'fixture' })];
  });
  const result = await app.runHandler(async () => {
    await pollRechargeSubscriptions();
    assert.deepEqual(calls.splice(0), ['users']);
    pending = true;
    targetUnavailable = true;
    await assert.rejects(pollRechargeSubscriptions(), /status=503/);
    assert.deepEqual(calls.splice(0), ['users', 'private-target']);
    targetUnavailable = false;
    await pollRechargeSubscriptions();
    assert.deepEqual(calls, ['users', 'private-target', 'poll', 'start', 'start', 'ack', 'ack']);
  }, app.events.privateMessage({ platform: 'qq-bot', botId: '123' }));
  assert.deepEqual(result.errors, []);
  assert.equal(sends, 1);
});

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
