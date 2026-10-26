import { goTestFixture } from './helpers/go-fixture.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import hub from '../src/response/redeemCode/res.ts';
import claim from '../src/response/redeemCode/claim/res.ts';
import { businessEnvelope, gameFixture } from './framework/fixture.ts';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const retired = /领取回归礼包|领取测试礼包|凡人修仙礼包码|老玩家签发|回归兑换码|测试兑换码/;
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGiftCodesSettlementFallbackRemoteProtocolAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_GIFT_CODE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));
assert.ok(receipts.some(r => r.result.success && r.result.data.kind === 'custom'));
assert.ok(receipts.some(r => !r.result.success));

for (const isPrivate of [true, false]) {
  test(`gift hub removes retired capabilities private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'menu' }));
    const event = isPrivate ? app.events.privateMessage({ text: '/兑换码', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/兑换码', platform: 'qq-bot' });
    const result = await app.runHandler(hub, event);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    for (const command of ['/领取邀请奖励', '/我']) assert.ok(view.commands.includes(command));
    assert.ok(view.text.includes('公测预约'));
    assert.doesNotMatch(view.text + view.commands.join(' '), retired);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
  test(`local gift receipts preserve results and errors private=${isPrivate}`, async t => {
    for (const { result: row } of receipts.filter(r => r.op === 'gift-codes.redeem')) {
      await t.test(row.success ? row.data.outcome : row.middleware.replies.at(-1).text, async t => {
        const { app, requests } = await gameFixture(t, () => row);
        const event = isPrivate ? app.events.privateMessage({ text: '/礼包码 LIVEGIFT', userId: 'player', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/礼包码 LIVEGIFT', userId: 'player', platform: 'qq-bot' });
        const result = await app.runHandler(claim, event);
        assert.equal(requests.length, 1);
        assert.equal(result.messages.length, 1);
        const view = inspectMessage(result.messages[0].nodes);
        if (!row.success) {
          assert.ok(view.text.includes(row.middleware.replies.at(-1).text));
          assert.ok(view.commands.includes('/我的邮件') || view.commands.includes('/兑换码'));
        } else if (row.data.outcome === 'usage') {
          assert.ok(view.text.includes('真实兑换码'));
          assert.ok(view.commands.includes('/兑换码'));
          assert.ok(!view.commands.includes('/礼包码 ABCD1234'));
        } else {
          assert.ok(view.text.includes(row.data.data.message));
          for (const reward of row.data.data.rewardSummary ?? []) assert.ok(view.text.includes(reward));
          assert.ok(view.commands.includes('/我的邮件'));
          assert.ok(!view.commands.includes('/储物袋'));
        }
        assert.doesNotMatch(view.text + view.commands.join(' '), retired);
        assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      });
    }
  });
}
