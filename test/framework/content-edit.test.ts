import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import router from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

after(shutdownLogger);

const guildEdits = [
  { command: '设置宗门简介', operation: 'guild.intro-set', limit: 30, receipt: { field: 'intro', outcome: 'updated' } },
  { command: '设置宗门公告', operation: 'guild.notice-set', limit: 50, receipt: { field: 'notice', outcome: 'updated' } },
  { command: '添加精华', operation: 'guild.essence-add', limit: 50, receipt: { id: 1, outcome: 'added' } }
];

for (const { command, operation, limit, receipt } of guildEdits) {
  test(`${command}显示长度提示并提交多行正文`, async t => {
    const { app, requests } = await gameFixture(t, ({ bid, body }) =>
      businessEnvelope(bid, (body.arguments as { content: string | null }).content === null
        ? { outcome: 'usage' }
        : { outcome: 'result', message: '已保存', receipt })
    );
    await app.mount({ responseRouter: router });
    const send = (text: string) => app.dispatch(app.events.groupMessage({ text, platform: 'qq-bot' }));
    const usage = await send(`/${command}`);
    const content = '第一行\n第二行';
    const edited = await send(`/${command} ${content}`);
    for (const result of [usage, edited]) {
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1);
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    }
    assert.match(usage.messages[0].text, new RegExp(`${limit}字`));
    const inputButton = usage.messages[0].nodes
      .flatMap(node => node.type === 'Markdown' ? node.value : [])
      .find(node => node.type === 'MD.button' && node.options?.data === `/${command} `);
    assert.ok(inputButton?.type === 'MD.button');
    assert.equal(inputButton.options?.autoEnter, false);
    assert.match(edited.messages[0].text, /已保存/);
    assert.deepEqual(requests.map(request => request.path), Array(2).fill(`/api/v2/robot/business/${operation}`));
    assert.deepEqual(requests.map(request => request.body.arguments), [{ content: null }, { content }]);
  });
}

test('改签名可保存和清空，群聊回执只提示去私聊查看', async t => {
  const { app, requests } = await gameFixture(t, ({ bid, body }) => {
    const { value } = body.arguments as { value: string };
    return businessEnvelope(bid, { action: 'signature', value, cleared: value === '' });
  });
  await app.mount({ responseRouter: router });
  const signature = '静听松风';
  const edited = await app.dispatch(app.events.groupMessage({ text: `/改签名 ${signature}`, platform: 'qq-bot' }));
  const cleared = await app.dispatch(app.events.privateMessage({ text: '/改签名', platform: 'qq-bot' }));
  for (const result of [edited, cleared]) {
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  }
  assert.match(edited.messages[0].text, /签名已更新，可私聊/);
  assert.ok(!edited.messages[0].text.includes(signature));
  assert.match(cleared.messages[0].text, /签名已清空/);
  assert.deepEqual(requests.map(request => request.path), Array(2).fill('/api/v2/robot/business/profile.signature'));
  assert.deepEqual(requests.map(request => request.body.arguments), [{ value: signature }, { value: '' }]);
});
