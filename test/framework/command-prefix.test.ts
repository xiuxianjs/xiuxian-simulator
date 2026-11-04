import { useMessage as frameworkMessage } from 'alemonjs';
import { FormatGui, createQuoteMarkdown } from '../../src/utils/messageHelper';
import { createGuildShopButtons } from '../../src/markdown/buttons/guild';
import { onboardingContent, showOnboarding } from '../../src/response/onboarding/context';
import type { GameEvent } from '../../src/types/event';
import assert from 'node:assert/strict';
import { test, after, before, mock } from 'node:test';
import { Format, onResponse, ResultCode, Router, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';
import { getAppConfig } from '../../src/utils/appConfig';
import { commandText, getCommandPrefix } from '../../src/utils/commandPrefix';
import { useMessage } from '../../src/utils/useMessage';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
test('合并后的垂钓入口保留自定义前缀、原业务参数和手动蓝链', async t => {
  const data = { rulesVersion: 'fishing-prefix-fixture', view: 'overview', title: '洞府垂钓', status: 'idle', sections: [{ title: '', id: '', suffix: '', lines: ['未垂钓'], actions: [{ label: '查看渔获', command: '/垂钓 渔获 1' }] }], footer: [{ label: '渔市', command: '/垂钓 渔市 buy bait 1' }] };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
  const config = app.run(getAppConfig);
  app.configure({ processor: { repeated_user_time: 0 }, 'qq-bot': { app_id: '100017' }, 'xiuxian-game': { ...config, commandPrefix: '**' } });
  const routes = app.run(createGameRouter);
  await app.mount({ responseRouter: routes.router });
  assert.equal(routes.matchesGameCommand({ name: 'private.message.create', MessageText: '**垂钓' }), true);
  assert.equal(routes.matchesGameCommand({ name: 'private.message.create', MessageText: '/垂钓' }), false);
  const result = await app.dispatch(app.events.privateMessage({ text: '**垂钓', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  assert.ok(requests.at(-1)?.path.endsWith('/fishing.query'));
  assert.deepEqual(requests.at(-1)?.body.arguments, { view: 'overview' });
  const page = inspectMessage(result.messages[0].nodes);
  assert.ok(page.commands.length > 0 && page.commands.every(command => command.startsWith('**')));
  const inspect = (nodes: unknown[]) => { for (const raw of nodes) { const node = raw as { type: string; value?: unknown; options?: Record<string, unknown> }; if (node.type === 'MD.button') { assert.equal(node.options?.autoEnter, false); assert.ok(!Object.hasOwn(node.options ?? {}, 'show')); assert.ok([...String(node.options?.data)].length <= 80); } if (Array.isArray(node.value)) { inspect(node.value); } } };
  inspect(result.messages[0].nodes);
});
for (const prefix of ['/', '**', '++', '修仙']) {
  test(`前缀 ${prefix} 的真实发送树和路由匹配`, async t => {
    const app = createTestApp({ config: { 'xiuxian-game': { commandPrefix: prefix }, processor: { repeated_user_time: 0 } } });
    t.after(() => app.dispose());
    const routes = app.run(() => createGameRouter());
    app.run(() => {
      assert.equal(routes.matchesGameCommand({ name: 'message.create', MessageText: `${prefix}商店` }), true);
      assert.equal(routes.matchesGameCommand({ name: 'message.create', MessageText: `${prefix}任务 abc` }), true);
      assert.equal(routes.matchesGameCommand({ name: 'message.create', MessageText: `${prefix}不存在的插件命令` }), false);
      if (prefix === '/') {
        assert.equal(routes.matchesGameCommand({ name: 'message.create', MessageText: '商店' }), false);
        for (const text of ['#商店', '＃商店', '!商店', '！商店']) {
          assert.equal(routes.matchesGameCommand({ name: 'message.create', MessageText: text }), false);
        }
      }
      assert.equal(routes.matchesGameCommand({ name: 'message.create', MessageText: `${prefix}/商店` }), false);
      if (prefix !== '/') {
        assert.equal(routes.matchesGameCommand({ name: 'message.create', MessageText: '/商店' }), false);
        assert.equal(routes.matchesGameCommand({ name: 'message.create', MessageText: '商店' }), false);
      }
      assert.equal(commandText('商店'), `${prefix}商店`);
      assert.equal(commandText('/炼丹确认 r1_abc'), `${prefix}炼丹确认 r1_abc`);
      assert.equal(commandText(`${prefix}商店`), `${prefix}商店`);
      assert.equal(commandText('notAutoConfirmation:/确认分解'), `notAutoConfirmation:${prefix}确认分解`);
    });
    const handler = onResponse(['message.create'], async () => {
      const [message] = useMessage();
      await message.send({ format: Format.create().addMarkdown(Format.createMarkdown()
        .addBlockquote(Format.createMarkdown().addButton('商店', { data: '/商店' })))
        .addButtonGroup(Format.createButtonGroup().addRow().addButton('帮助', '/修仙帮助').addButton('链接', 'https://example.com', { type: 'link' })) });
    });
    const result = await app.runHandler(handler, app.events.groupMessage({ text: `${prefix}商店` }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const rendered = JSON.stringify(message.nodes);
    assert.ok(rendered.includes(`${prefix}商店`), rendered);
    assert.ok(rendered.includes(`${prefix}修仙帮助`), rendered);
    assert.ok(rendered.includes('https://example.com'), rendered);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.ok(inspectMessage(message.nodes));
  });
}

for (const prefix of ['/', '**']) {
  test(`真实业务请求使用原契约 ${prefix}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      mode: 'replace', result: { toolId: 1, userToolId: 2, toolName: '测试丹炉', typeName: '丹炉', gradeName: '凡品', gradeLevel: 1, message: '已切换测试丹炉' }
    }));
    const config = app.run(getAppConfig);
    app.configure({ processor: { repeated_user_time: 0 }, 'qq-bot': { app_id: '100017' }, 'xiuxian-game': { ...config, commandPrefix: prefix } });
    await app.mount({ responseRouter: app.run(createGameRouter).router });
    const result = await app.dispatch(app.events.groupMessage({ text: `${prefix}替换 2`, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, { identifier: '2' });
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const prefix of ['/', '**']) {
test(`严格前缀 ${prefix} 未匹配时，下游插件收到完整原文`, async t => {
  const app = createTestApp({ config: { 'xiuxian-game': { commandPrefix: prefix }, processor: { repeated_user_time: 0 } } });
  t.after(() => app.dispose());
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const downstream = Router.create();
  downstream.res({ events: ['message.create', 'private.message.create', 'interaction.create'] }, () => Promise.resolve(async (event: { MessageText?: string }) => {
    const [message] = useMessage();
    await message.send({ format: Format.create().addText(event.MessageText ?? '') });
  }));
  await app.mount({ responseRouter: downstream.define }, undefined, 'other-plugin');
  for (const text of ['商店', '替换 2', '任务 abc', '任务面板', '继续引导', `${prefix}/商店`, '聊天内容', ...(prefix === '/' ? [] : ['/商店']), `${prefix}其他插件 原参数`, '/其他插件']) {
    const result = await app.dispatch(app.events.groupMessage({ text }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.equal(result.messages[0].text, text);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  }
});

}

test('前缀只替换命令头，保护凭据、回调和长度预算', () => {
  assert.equal(commandText('/发飞信 123 /正文 **原文', '**'), '**发飞信 123 /正文 **原文');
  assert.equal(commandText('onboarding.v1_abc', '**'), 'onboarding.v1_abc');
  assert.equal([...commandText('/' + '测'.repeat(78), '**')].length, 80);
  assert.throws(() => commandText('/' + '测'.repeat(79), '**'), /80/);
});

test('配置修改在新实例中生效', async t => {
  const first = createTestApp({ config: { 'xiuxian-game': { commandPrefix: '**' } } });
  const restarted = createTestApp({ config: { 'xiuxian-game': { commandPrefix: '++' } } });
  t.after(async () => { await first.dispose(); await restarted.dispose(); });
  assert.equal(first.run(getCommandPrefix), '**');
  first.configure({ 'xiuxian-game': { commandPrefix: '++' } });
  assert.equal(first.run(getCommandPrefix), '**');
  assert.equal(restarted.run(getCommandPrefix), '++');
});

test('自定义前缀下教学会话拒绝裸指令和旧前缀，配置前缀保留原业务契约', async t => {
  const view = { status: 'active' as const, phase: 'profile', version: 1, title: '教学', lines: [], feedback: [], actions: [{ label: '查看角色', command: '/我' }] };
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...view, version: 2 }));
  const config = app.run(getAppConfig);
  app.configure({ processor: { repeated_user_time: 0 }, 'qq-bot': { app_id: '100017' }, 'xiuxian-game': { ...config, commandPrefix: '**' } });
  await app.mount({ responseContent: onboardingContent });
  const event = app.events.groupMessage({ text: '**继续引导', platform: 'qq-bot' });
  await app.invoke(event, () => showOnboarding(event as GameEvent, view));
  for (const text of ['我', '/我', '**/我']) {
    const result = await app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 0);
    assert.equal(requests.length, 0);
  }
  const result = await app.dispatch(app.events.groupMessage({ text: '**我', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].body.arguments, { version: 1, command: '/我' });
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});

for (const prefix of ['/', '**', '++']) {
  test(`构造阶段覆盖所有 Gui 出口，无需发送兜底 ${prefix}`, async t => {
    const app = createTestApp({ config: { 'xiuxian-game': { commandPrefix: prefix } } });
    t.after(() => app.dispose());
    const result = await app.runHandler(onResponse(['message.create'], async () => {
      const [message] = frameworkMessage();
      const content = createQuoteMarkdown(['状态：可操作'], [{ label: '内联', command: '/内联 1' }]);
      content.absorb(createGuildShopButtons());
      await message.send(FormatGui({ title: '出口测试', content,
        header: [{ label: '头部', command: '/头部' }],
        nav: { current: 1, total: 2, command: '/分页 {page}' },
        footer: [{ label: '页脚', command: '/页脚' }],
        keyboard: [[{ label: '键盘', command: '/键盘' }, { label: '链接', command: 'scheme://original', type: 'link' }]],
        bar: [{ label: '全局', command: '/全局' }]
      }));
    }), app.events.groupMessage({ text: `${prefix}出口测试` }));
    assert.deepEqual(result.errors, []);
    const commands = inspectMessage(result.messages[0].nodes).commands;
    for (const command of ['内联 1', '头部', '分页 2', '页脚', '键盘', '全局', '我的宗门', '宗门商店 刷新']) {
      assert.ok(commands.includes(`${prefix}${command}`), JSON.stringify(commands));
    }
    assert.ok(JSON.stringify(result.messages[0].nodes).includes('scheme://original'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
