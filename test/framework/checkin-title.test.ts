import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import daily from '../../src/response/signIn/daily/res';
import hub from '../../src/response/signIn/hub/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => {
  mock.timers.reset();
  await shutdownLogger();
});

for (const days of [7, 14]) {
  for (const privateChat of [false, true]) {
    test(`称号签到真实发送节点：累计${days}天，${privateChat ? '私聊' : '群聊'}`, async t => {
      const expires = days === 7 ? '2026-10-21 12:00' : '2026-11-08 00:00';
      const message = `称号「我是主角」有效期更新至：${expires}（北京时间）；可在称号列表佩戴`;
      const data = {
        accumulatedDays: days,
        issued: [{ type: 'title', name: '我是主角', amount: 1 }],
        titleReward: { id: 9, name: '我是主角', expireTime: expires.replace(' ', 'T') + ':00+08:00', message },
        ritualText: '',
        repeatSuffix: ''
      };
      const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
      const event = privateChat
        ? app.events.privateMessage({ text: '/日常签到', platform: 'qq-bot' })
        : app.events.groupMessage({ text: '/日常签到', platform: 'qq-bot' });
      const result = await app.runHandler(daily, event);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].path, '/api/v2/robot/business/checkin.daily');
      assert.equal(result.messages.length, 1);
      const sent = result.messages[0];
      assert.ok(sent.nodes.length > 0);
      assert.ok(sent.text.includes(`本月累计签到：${days}天`), sent.text);
      assert.ok(sent.text.includes('我是主角 ×1'), sent.text);
      assert.ok(sent.text.includes(message), sent.text);
      assert.equal(result.actions[sent.actionIndex].results?.[0].code, ResultCode.Ok);
    });
  }
}

test('统一签到保留服务端称号到期回执', async t => {
  const message = '签到成功（累计14天）\n获得：我是主角 ×1\n称号「我是主角」有效期更新至：2026-11-08 00:00（北京时间）；可在称号列表佩戴';
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, { results: [{ name: '日常签到', status: 'done', message }] }));
  const result = await app.runHandler(hub, app.events.privateMessage({ text: '/签到', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.ok(result.messages[0].text.includes('2026-11-08 00:00'));
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
