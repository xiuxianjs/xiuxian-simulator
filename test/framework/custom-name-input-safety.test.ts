import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import battleTemplate from '../../src/response/battleTemplate/res';
import myThemes from '../../src/response/theme/myThemes/res';
import activateTheme from '../../src/response/theme/activateTheme/res';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

for (const reason of ['战斗预设名称包含不适当的内容，请修改后重试', '战斗预设名称审核暂不可用，请稍后再试']) {
  test(`战斗预设保存拒绝时只显示固定提示：${reason}`, async t => {
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, undefined, [{
      title: '战斗模板', heading: '', text: reason, buttons: [], advice: []
    }]));
    const result = await app.runHandler(battleTemplate, app.events.groupMessage({ text: '/保存战斗模板 2 回显占位词', platform: 'qq-bot' }));
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(reason));
    assert.doesNotMatch(view.text, /回显占位词/);
    assert.ok(view.commands.every(command => !command.includes('回显占位词')));
    assert.deepEqual(requests[0].body.arguments, { slotText: '2', name: '回显占位词' });
  });
}

test('历史预设以槽位名展示时仍可应用和删除', async t => {
  const summary = {
    slot: 1, name: '回显占位词', equipmentCount: 0, equipmentNames: [], skillNames: {},
    missingEquipmentCount: 0, missingSkillCount: 0
  };
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, { templates: [summary], current: { ...summary, slot: 0, name: '' } }));
  const result = await app.runHandler(battleTemplate, app.events.groupMessage({ text: '/战斗模板', platform: 'qq-bot' }));
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /战斗模板1/);
  assert.doesNotMatch(view.text, /回显占位词/);
  assert.ok(view.commands.includes('/应用战斗模板 1'));
  assert.ok(view.commands.includes('/删除战斗模板 1'));
});

test('历史主题以通用名展示时仍可按编号切换', async t => {
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, {
    themes: [{ id: 12, name: '回显占位词', source: 'custom', config: '{}', isActive: false, sortOrder: 1 }],
    permission: { canCustomEdit: true, maxCustomSlots: 3, requiredVipLevel: 6 }
  }));
  const result = await app.runHandler(myThemes, app.events.groupMessage({ text: '/我的主题', platform: 'qq-bot' }));
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /自定义主题/);
  assert.doesNotMatch(view.text, /回显占位词/);
  assert.ok(view.commands.includes('/切换主题 12'));
});

for (const namesReviewed of [undefined, true]) {
  for (const command of ['/保存战斗模板 2 回显占位词', '/应用战斗模板 2']) {
    test(`${command.split(' ')[0]}按审核标记选择展示名（${namesReviewed ?? '旧回执'}）`, async t => {
      const { app } = await gameFixture(t, r => businessEnvelope(r.bid, {
        namesReviewed, slot: 2, name: '回显占位词', created: true, cacheInvalidated: true,
        equipmentCount: 0, equipmentNames: [], skillNames: {}, missingEquipmentCount: 0, missingSkillCount: 0
      }));
      const result = await app.runHandler(battleTemplate, app.events.groupMessage({ text: command, platform: 'qq-bot' }));
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      const view = inspectMessage(message.nodes);
      assert.equal(view.text.includes('回显占位词'), namesReviewed === true);
      if (!namesReviewed) assert.match(view.text, /战斗模板2/);
      assert.ok(view.commands.every(command => !command.includes('回显占位词')));
    });
  }

  test(`切换主题按审核标记选择提示（${namesReviewed ?? '旧回执'}）`, async t => {
    const { app } = await gameFixture(t, r => businessEnvelope(r.bid, {
      namesReviewed, outcome: 'activated', id: 12, name: '回显占位词'
    }));
    const result = await app.runHandler(activateTheme, app.events.groupMessage({ text: '/切换主题 12', platform: 'qq-bot' }));
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.match(view.text, namesReviewed ? /已切换到主题「回显占位词」/ : /已切换主题/);
    assert.equal(view.text.includes('回显占位词'), namesReviewed === true);
  });
}
