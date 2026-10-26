import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import router from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

for (const isPrivate of [false, true]) for (const snapshotError of [null, '播种已完成，灵田状态刷新失败，请查看灵田，不要重复原操作。']) {
  test(`recipe planting receipt private=${isPrivate} snapshot=${snapshotError}`, async t => {
    const receipt = '智能播种 · 测试丹\n目标：100炉\n聚灵草：已播种2块\n备用灵草：尚缺5份\n预计材料可备齐1/100炉，本次补齐1炉。';
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      mode: 'plant', result: { message: receipt, overview: null, snapshotError }
    }));
    const event = isPrivate
      ? app.events.privateMessage({ text: '/一键播种 测试丹 100', platform: 'qq-bot' })
      : app.events.groupMessage({ text: '/一键播种 测试丹 100', platform: 'qq-bot' });
    await app.mount({ responseRouter: router });
    const result = await app.dispatch(event);
    assert.deepEqual(result.errors, []);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { plotIndex: null, seedName: null, recipeName: '测试丹', count: '100' });
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(receipt));
    if (snapshotError) assert.ok(view.text.includes(snapshotError));
    assert.ok(view.commands.includes('/灵田'));
    assert.ok(view.commands.includes('/丹方'));
    assert.ok(!view.commands.some(command => command.startsWith('/一键播种')));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
