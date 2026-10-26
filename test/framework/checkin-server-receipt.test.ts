import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import hub from '../../src/response/signIn/hub/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => {
  mock.timers.reset();
  await shutdownLogger();
});
const output = goTestFixture(['test', './internal/service', '-run', '^TestCheckInHubResponseContractSerialization$', '-count=1', '-v'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)),
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024
});
const encoded = output.match(/CHECKIN_HUB_RESPONSE_FIXTURES=(.+)/)?.[1];
assert.ok(encoded, '必须使用真实 Go 结算回执');
const fixtures = JSON.parse(encoded) as Record<string, unknown>;

for (const scenario of ['partial', 'repeated', 'missingConfig']) {
  for (const privateChat of [false, true]) {
    test(`Go 回执经 SDK 和真实处理器发送：${scenario}/${privateChat ? '私聊' : '群聊'}`, async t => {
      const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, fixtures[scenario]));
      const event = privateChat
        ? app.events.privateMessage({ text: '/签到', platform: 'qq-bot' })
        : app.events.groupMessage({ text: '/签到', platform: 'qq-bot' });
      const result = await app.runHandler(hub, event);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].path, '/api/v2/robot/business/checkin.hub');
      assert.ok(requests[0].idempotencyKey);
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      assert.ok(message.nodes.length > 0);
      assert.equal(message.target?.targetId, privateChat ? event.UserId : event.ChannelId);
      assert.ok(message.commands.includes('/商店 签到'));
      assert.equal(message.text.includes('灵石 ×100'), false, '回滚的日常奖励不能展示为所得');
      if (scenario === 'partial') {
        for (const reward of ['灵石 ×7', '灵晶 ×11']) assert.ok(message.text.includes(reward), message.text);
        assert.equal(message.commands.includes('/登仙台签到'), false);
        assert.equal(message.commands.includes('/新人狂欢签到'), false);
      } else if (scenario === 'repeated') {
        assert.equal(message.text.includes('获得：'), false, '重复领取不能展示旧奖励为新所得');
        assert.equal(message.commands.includes('/新人狂欢签到'), false);
      } else {
        assert.ok(message.text.includes('❌ 新人狂欢签到：签到奖励配置暂不可用，本次未领取，请稍后重试'), message.text);
        assert.ok(message.commands.includes('/新人狂欢签到'));
        assert.equal(message.text.includes('灵晶 ×11'), false);
      }
    });
  }
}
