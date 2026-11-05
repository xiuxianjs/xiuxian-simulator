import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Format, ResultCode, Router, getConfig, shutdownLogger, useMessage as frameworkMessage } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';
import { commandCharacterLength, commandText, internalCommandText, prefixCommandFormat } from '../../src/utils/commandPrefix';
import { legacyCommandHandler } from '../../src/utils/legacyCommandHandler';
import { businessEnvelope, gameFixture } from './fixture';
after(() => shutdownLogger());
const policy = (space: boolean) => ({ prefix: '/修仙', space, format: { enabled: true, match: '^[/#＃!！]\\s*', replacement: '' } });

for (const space of [false, true]) {
  test(`新版应用前缀匹配、内部契约和真实发送 space=${space}`, async t => {
    const app = createTestApp({ config: { apps: { 'xiuxian-game': { command: policy(space) } }, 'xiuxian-game': { commandPrefix: '**' } } });
    t.after(() => app.dispose());
    const prefix = `/修仙${space ? ' ' : ''}`;
    const routes = app.run(createGameRouter);
    await app.invoke(app.events.groupMessage(), async () => {
      assert.equal(routes.matchesGameCommand({ name: 'message.create', MessageText: `${prefix}商店` }), true);
      for (const text of ['/商店', '**商店', '商店', space ? '/修仙商店' : '/修仙 商店']) {
        assert.equal(routes.matchesGameCommand({ name: 'message.create', MessageText: text }), false);
      }
      assert.equal(internalCommandText(`${prefix}背包 2`), '/背包 2');
      assert.equal(commandText('签到'), '/签到');
      assert.equal(commandCharacterLength('/签到'), [...`${prefix}签到`].length);
      assert.throws(() => commandText('/' + '甲'.repeat(79)), /80/);
      const md = Format.createMarkdown().addButton('签到', { data: commandText('/签到') })
        .addButton('其他前缀', { data: '#背包 2' })
        .addButton('回调', { data: 'xx:callback', type: 'call' });
      const format = prefixCommandFormat(Format.create().addMarkdown(md));
      const before = JSON.stringify(format.value);
      const result = await frameworkMessage()[0].send({ format });
      assert.ok(result.every(item => item.code === ResultCode.Ok));
      assert.equal(JSON.stringify(format.value), before);
    }, 'xiuxian-game');
    const sent = await app.invoke(app.events.groupMessage(), async () => {
      await frameworkMessage()[0].send({ format: prefixCommandFormat(Format.create().addMarkdown(Format.createMarkdown().addButton('签到', { data: '/签到' }))) });
    }, 'xiuxian-game');
    assert.deepEqual(inspectMessage(sent.messages[0].nodes).commands, [`${prefix}签到`]);
  });
}

test('新版 res 旧业务适配保留参数并在放行前恢复文本', async t => {
  const app = createTestApp({ config: { apps: { 'xiuxian-game': { command: policy(true) } } } });
  t.after(() => app.dispose());
  const event = app.events.groupMessage({ text: '/修仙 背包 2' });
  const handler = legacyCommandHandler((e: typeof event, next: () => void) => {
    assert.equal(e.MessageText, '/背包 2'); next();
  }) as (e: typeof event, next: () => void) => Promise<void>;
  await app.invoke(event, async () => { await handler(event, () => assert.equal(event.MessageText, '/修仙 背包 2')); }, 'xiuxian-game');
});

test('新版前缀垂钓真实路由到业务 API 往返', async t => {
  const data = { rulesVersion: 'native-prefix', view: 'overview', title: '洞府垂钓', status: 'idle', sections: [], footer: [{ label: '渔市', command: '/垂钓 渔市' }] };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  app.configure({ ...app.run(() => getConfig().value), apps: { 'xiuxian-game': { command: policy(true) } } });
  const routes = app.run(createGameRouter);
  await app.mount({ responseRouter: routes.router }, undefined, 'xiuxian-game');
  const result = await app.dispatch(app.events.privateMessage({ text: '/修仙 垂钓', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.ok(requests.some(request => request.path.endsWith('/fishing.query')), JSON.stringify({ requests: requests.map(r => r.path), messages: result.messages, reasons: result.reasons }));
  assert.ok(result.messages.length > 0);
  assert.ok(inspectMessage(result.messages[0].nodes).commands.every(command => command.startsWith('/修仙 ')));
});

for (const enabled of [false, true]) {
  test(`Format 开关保持源值且保留链接与回调 enabled=${enabled}`, async t => {
    const app = createTestApp({ config: { apps: { 'xiuxian-game': { command: { ...policy(false), format: { ...policy(false).format, enabled } } } } } });
    t.after(() => app.dispose());
    const result = await app.invoke(app.events.groupMessage(), async () => {
      const md = Format.createMarkdown().addButton('原样', { data: '/原样', commandTarget: false })
        .addButton('链接', { data: 'https://example.com/', type: 'link' })
        .addButton('回调', { data: '/回调', type: 'call' }).addButton('转换', { data: '#签到' });
      const receipts = await frameworkMessage()[0].send({ format: prefixCommandFormat(Format.create().addMarkdown(md)) });
      assert.ok(receipts.length > 0 && receipts.every(item => item.code === ResultCode.Ok));
    }, 'xiuxian-game');
    const serialized = JSON.stringify(result.messages[0].nodes);
    for (const value of ['/原样', 'https://example.com/', '/回调', enabled ? '/修仙签到' : '#签到']) assert.ok(serialized.includes(value));
  });
}


test('新前缀未知消息继续交给其他插件且保留原文', async t => {
  const app = createTestApp({ config: { apps: { 'xiuxian-game': { command: policy(true) } }, processor: { repeated_user_time: 0 } } });
  t.after(() => app.dispose());
  await app.mount({ responseRouter: app.run(createGameRouter).router }, undefined, 'xiuxian-game');
  const downstream = Router.create({ events: ['message.create'] });
  const seen: string[] = [];
  downstream.res({}, async () => (event: { MessageText: string }) => { seen.push(event.MessageText); });
  await app.mount({ responseRouter: downstream.define }, undefined, 'other-plugin');
  for (const text of ['/其他插件 参数', '/修仙 未注册功能', '普通聊天']) {
    const result = await app.dispatch(app.events.groupMessage({ text }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 0);
    assert.equal(seen.at(-1), text);
  }
});


test('特殊源格式按配置转换，不擅自增加斜杠', async t => {
  const app = createTestApp({ config: { apps: { 'xiuxian-game': { command: { prefix: '/修仙', format: { enabled: true, match: '^启动游戏::', replacement: '' } } } } } });
  t.after(() => app.dispose());
  const result = await app.invoke(app.events.groupMessage(), async () => {
    assert.equal(commandText('启动游戏::签到'), '启动游戏::签到');
    assert.equal(commandCharacterLength('启动游戏::签到'), [...'/修仙签到'].length);
    const receipts = await frameworkMessage()[0].send({ format: prefixCommandFormat(Format.create().addMarkdown(Format.createMarkdown().addButton('签到', { data: commandText('启动游戏::签到') }))) });
    assert.ok(receipts.length > 0 && receipts.every(item => item.code === ResultCode.Ok));
  }, 'xiuxian-game');
  assert.deepEqual(inspectMessage(result.messages[0].nodes).commands, ['/修仙签到']);
});

for (const command of [{ prefix: '/' }, { prefix: '/修仙' }, { prefix: '/修仙', space: true }]) {
  test(`DSL 中间件拒绝回执不中断 ${JSON.stringify(command)}`, async t => {
    const { app, requests } = await gameFixture(t, request => ({
      success: true, branch: 'middleware',
      middleware: { ...businessEnvelope(request.bid, {}).middleware, outcome: 'reject', reason: 'MUTED',
        replies: [{ title: '验证回执', heading: '', text: '必须展示', buttons: [], advice: [] }] }
    }));
    app.configure({ ...app.run(() => getConfig().value), apps: { 'xiuxian-game': { command } } });
    await app.mount({ responseRouter: app.run(createGameRouter).router }, undefined, 'xiuxian-game');
    const text = command.prefix + (command.space ? ' ' : '') + '垂钓';
    const event = app.events.privateMessage({ text, platform: 'qq-bot' });
    const result = await app.dispatch(event);
    assert.deepEqual(result.errors, []);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    assert.ok(result.messages[0].text.includes('必须展示'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    assert.equal(event.MessageText, text);
  });
}

for (const settings of [{ commandPrefix: '**' }, { commandPrefix: '++' }, { commandPrefix: '**', routeText: { allowBare: true } }]) {
  test(`旧前缀 res 继续执行真实客服处理器 ${JSON.stringify(settings)}`, async t => {
    const app = createTestApp({ config: { 'xiuxian-game': settings, processor: { repeated_user_time: 0 } } });
    t.after(() => app.dispose());
    await app.mount({ responseRouter: app.run(createGameRouter).router }, undefined, 'xiuxian-game');
    for (const text of [settings.commandPrefix + '客服', ...(settings.routeText?.allowBare ? ['客服'] : [])]) {
      const event = app.events.groupMessage({ text });
      const result = await app.dispatch(event);
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1);
      assert.equal(result.messages[0].text, '请私聊机器人使用客服功能。');
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      assert.equal(event.MessageText, text);
    }
  });
}
