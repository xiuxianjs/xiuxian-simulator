import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/cavePlot/action/res';
import { parseBackendCaveAccelerationPreview } from '../../src/api/bot/cave-plot-actions';
import { businessEnvelope, gameFixture } from './fixture';

after(async () => shutdownLogger());

const preview = {
  found: true, message: '第2块灵田尚未成熟', plotIndex: 2,
  greenBottleUsedCount: 0, greenBottleLimit: 3, remainingSeconds: 18000, remainingHours: 5,
  lingfeiCount: 0, greenBottleCount: 0, remainingSlots: 3, maxLingfei: 0, maxGreenBottle: 0,
  spiritStoneEnabled: true, spiritStone: 500, stoneCost: 50, maxSpiritStone: 3, ripenCost: 101, canRipen: true
};

for (const [seconds, hours] of [[undefined, '2'], [7560, '2.1'], [7920, '2.2'], [8352, '2.32'], [8928, '2.48']] as const) {
  test(`灵石预览使用服务端冻结时长：${seconds ?? '旧回执'}秒`, async t => {
    const data = { ...preview, ...(seconds === undefined ? {} : { stoneSecondsPerUse: seconds }) };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { mode: 'preview', preview: data }));
    const result = await app.runHandler(handler, app.events.privateMessage({ text: '/灵田加速 2', platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(`加速最多${hours}小时 · 50灵石`), view.text);
    assert.ok(view.commands.includes('/灵田加速 2 灵石 1'));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/api/v2/robot/business/cave.accelerate');
  });
}

test('时长缺省兼容，非法时长拒绝展示', () => {
  assert.equal(parseBackendCaveAccelerationPreview(preview).stoneSecondsPerUse, undefined);
  for (const value of [0, -1, 2.5, null, '8928', Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => parseBackendCaveAccelerationPreview({ ...preview, stoneSecondsPerUse: value }), /灵石加速时长/);
  }
});
