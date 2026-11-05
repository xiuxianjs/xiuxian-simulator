import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { Format, Router, ResultCode, createResult, getConfig, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';
import { onboardingContent, listenOnboarding } from '../../src/response/onboarding/context';
import { hasCommandPrefix, displayCommandText, commandText, assertCommandBudget } from '../../src/utils/commandPrefix';
import { useMessage } from '../../src/utils/useMessage';
import { businessEnvelope, gameFixture } from './fixture';
after(() => shutdownLogger());
const view = { status: 'active' as const, phase: 'milestone.cave', version: 1, title: '教学', lines: [], feedback: [], actions: [{ label: '垂钓', command: '/垂钓' }] };
const policy = (space: boolean) => ({ prefix: '/修仙', space, format: { enabled: true, match: '^/', replacement: '' } });

for (const space of [false, true]) {
  test(`Context 与订阅校验遵守 space=${space}`, async t => {
    const app = createTestApp({ config: { apps: { 'xiuxian-game': { command: policy(space) } } } });
    t.after(() => app.dispose());
    await app.mount({ responseContent: onboardingContent, responseRouter: app.run(createGameRouter).router }, undefined, 'xiuxian-game');
    const other = Router.create({ events: ['message.create'] });
    const seen: string[] = [];
    other.res({}, async () => (event: { MessageText: string }) => { seen.push(event.MessageText); });
    await app.mount({ responseRouter: other.define }, undefined, 'other');
    await app.invoke(app.events.groupMessage(), () => {
      listenOnboarding(view);
      assert.equal(hasCommandPrefix(space ? '/修仙垂钓' : '/修仙 垂钓'), false);
      assert.equal(hasCommandPrefix(space ? '/修仙 垂钓' : '/修仙垂钓'), true);
    }, 'xiuxian-game');
    const text = space ? '/修仙垂钓' : '/修仙 垂钓';
    const result = await app.dispatch(app.events.groupMessage({ text }));
    assert.deepEqual(result.errors, []);
    assert.deepEqual(seen, [text]);
    assert.equal(result.messages.length, 0);
  });
}

test('过期教学放行恢复原文并进入真实垂钓业务', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid,
    request.path.endsWith('/onboarding.view') ? { ...view, version: 2 } : {
      rulesVersion: 'boundary', view: 'overview', title: '洞府垂钓', status: 'idle', sections: [], footer: []
    }));
  app.configure({ ...app.run(() => getConfig().value), apps: { 'xiuxian-game': { command: policy(true) } } });
  await app.mount({ responseContent: onboardingContent, responseRouter: app.run(createGameRouter).router }, undefined, 'xiuxian-game');
  await app.invoke(app.events.groupMessage(), () => listenOnboarding(view), 'xiuxian-game');
  const event = app.events.groupMessage({ text: '/修仙 垂钓' });
  const result = await app.dispatch(event);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(requests.map(request => request.path.split('/').at(-1)), ['onboarding.view', 'fishing.query']);
  assert.equal(event.MessageText, '/修仙 垂钓');
  assert.ok(result.messages.length > 0);
  assert.ok(result.messages.every(message => result.actions[message.actionIndex].results?.[0].code === ResultCode.Ok));
});

for (const enabled of [false, true]) {
  test(`文字指令与按钮源指令分离 format.enabled=${enabled}`, async t => {
    const app = createTestApp({ config: { apps: { 'xiuxian-game': { command: { ...policy(true), format: { ...policy(true).format, enabled } } } } } });
    t.after(() => app.dispose());
    await app.invoke(app.events.groupMessage(), () => {
      assert.equal(displayCommandText('确认分解'), '/修仙 确认分解');
      assert.equal(displayCommandText('/取消'), '/修仙 取消');
      assert.equal(commandText('确认分解'), '/确认分解');
    }, 'xiuxian-game');
  });
}

test('编辑出口和直发预算检查拒绝超长指令，80 字符可发送', async t => {
  const app = createTestApp({ config: { apps: { 'xiuxian-game': { command: policy(false) } } } });
  t.after(() => app.dispose());
  let edits = 0;
  app.actions.on('message.edit', () => { edits++; return [createResult(ResultCode.Ok, 'ok', {})]; });
  const button = (length: number) => Format.create().addMarkdown(Format.createMarkdown().addButton('确认', { data: '/' + '甲'.repeat(length) }));
  await app.invoke(app.events.groupMessage(), async () => {
    const tooLong = button(78);
    const original = JSON.stringify(tooLong.value);
    assert.throws(() => assertCommandBudget(tooLong), /80/);
    await assert.rejects(async () => useMessage()[0].edit({ messageId: 'local', format: tooLong }), /80/);
    assert.equal(edits, 0);
    assert.equal(JSON.stringify(tooLong.value), original);
    const receipt = await useMessage()[0].edit({ messageId: 'local', format: button(77) });
    assert.equal(receipt.code, ResultCode.Ok);
    assert.equal(edits, 1);
  }, 'xiuxian-game');
});
