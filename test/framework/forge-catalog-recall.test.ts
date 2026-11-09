import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import gift from '../../src/response/companion/gift/res';
import forge from '../../src/response/profession/forge/res';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

test('旧赠送类别直接提示禁赠', async t => {
  const { app, requests } = await gameFixture(t, () => {
    throw new Error('禁赠类别不应发出请求');
  });

  for (const text of ['/赠送 丹方 旧丹方 2', '/赠送 图纸 铁盔锻造图纸 2', '/赠送 锻造图纸']) {
    const result = await app.runHandler(gift, app.events.privateMessage({ text, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.match(inspectMessage(message.nodes).text, /丹方和锻造图纸不可赠送/);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  }

  assert.equal(requests.length, 0);
});

test('锻造图鉴显示自动解锁规则并移除手动学习按钮', async t => {
  const { overview } = JSON.parse(readFileSync(new URL('../fixtures/forge-contracts.json', import.meta.url), 'utf8'));
  overview.recipes[0].learned = false;
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, overview));
  const result = await app.runHandler(forge, app.events.privateMessage({ text: '/锻造图纸', platform: 'qq-bot' }));

  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /达到对应锻造等级后自动解锁图纸/);
  assert.ok(!view.commands.includes('/学习锻造图纸'));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});
