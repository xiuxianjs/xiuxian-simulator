import assert from 'node:assert/strict';
import { test, after, before, mock } from 'node:test';
import { ResultCode, Router, shutdownLogger } from 'alemonjs';
import router from '../../src/router';
import { gameFixture, businessEnvelope } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const unit = { id: 'a', name: '道友', hp: 10, maxHp: 10, isDead: false, position: 1 };
for (const text of ['/十连比试 2', '/比试 2', '/比斗 2', '/切磋 2']) {
 for (const privateChat of [true, false]) {
  test(`${privateChat ? "私聊" : "群聊"} ${text} 使用真实处理器与发送回执`, async t => {
    const batch = text.includes('十连');
    const count = batch ? 3 : 1;
    const f = await gameFixture(t, r => businessEnvelope(r.bid, {
      allowed: true, realmName: '筑基', targetUid: 2,
      battle: {
        settledCount: count,
        battleView: { totalRounds: 1, finalState: { sideA: [unit], sideB: [{ ...unit, id: 'b', hp: 0, isDead: true }] } },
        battleLogId: 'spar-batch-log', winner: 'A', baseExperience: count * 14,
        experience: count * 14, expBonusText: '', qiCost: count * 10,
        dailyMax: 10, newCount: batch ? 10 : 1, proficiencyResult: { gained: true, points: count }
      }
    }));
    await f.app.mount({ responseRouter: router });
    const options = { text, platform: 'qq-bot' };
    const result = await f.app.dispatch(privateChat ? f.app.events.privateMessage(options) : f.app.events.groupMessage(options));
    assert.deepEqual(result.errors, []);
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].path, '/api/v2/robot/business/pvp.spar');
    assert.deepEqual(f.requests[0].body.arguments, { targetUid: '2', targetBid: null, ...(batch ? { batch: true } : {}) });
    assert.ok(f.requests[0].idempotencyKey);
    assert.equal(result.messages.length, 2);
    for (const message of result.messages) {
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      assert.ok(message.nodes);
    }
    const message = result.messages[1];
    assert.match(message.text, new RegExp(`消耗元力：${count * 10}`));
    assert.match(message.text, new RegExp(`获得 ${count} 点熟练点`));
    if (batch) assert.match(message.text, /实际结算：3次（共用一场战斗结果）/);
    assert.ok(message.commands.includes(batch ? '/十连比试 2' : '/比试 2'));
  });
}
}

for (const privateChat of [true, false]) test(`${privateChat ? '私聊' : '群聊'}其他包的决斗指令不被比试处理`, async t => {
  const f = await gameFixture(t, r => businessEnvelope(r.bid, {}));
  await f.app.mount({ responseRouter: router });
  const forwarded: string[] = [];
  const downstream = Router.create();
  downstream.res({ events: ['message.create', 'private.message.create'] }, async () => (event: { MessageText: string }) => {
    forwarded.push(event.MessageText);
  });
  await f.app.mount({ responseRouter: downstream.define }, undefined, 'other-plugin');
  const options = { text: '/决斗 2', platform: 'qq-bot' };
  const result = await f.app.dispatch(privateChat ? f.app.events.privateMessage(options) : f.app.events.groupMessage(options));
  assert.deepEqual(result.errors, []);
  assert.equal(f.requests.length, 0);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(forwarded, ['/决斗 2']);
});
