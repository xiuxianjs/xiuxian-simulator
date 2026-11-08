import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { onResponse, ResultCode, shutdownLogger, useMessage } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { FormatGui } from '../../src/utils/messageHelper';

after(() => shutdownLogger());

test('主页操作由底栏提供，关闭底栏的页面可保留自己的入口', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const home = { label: '我的主页', command: '/我' };
  for (const withBar of [true, false]) {
    const handler = onResponse(['private.message.create'], async () => {
      const [message] = useMessage();
      await message.send(FormatGui({
        isPrivate: true,
        title: '导航',
        footer: [home, { label: '返回洞府', command: '/我的洞府' }],
        ...(withBar ? { header: [home], keyboard: [home] } : { bar: false as const })
      }));
    });
    const run = await app.runHandler(handler, app.events.privateMessage({ platform: 'qq-bot' }));
    assert.deepEqual(run.errors, []);
    assert.equal(run.messages.length, 1);
    const message = run.messages[0];
    assert.equal(run.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.equal(view.commands.filter(command => command === '/我').length, 1);
    assert.ok(view.commands.includes('/我的洞府'));
    assert.equal(view.text.includes('我的主页'), !withBar);
  }
});
