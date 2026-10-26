import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import mingwu from '../../src/response/mingwudan/confirm/res';
import soulUpgrade from '../../src/response/soulArtifact/upgrade/res';
import soulGrade from '../../src/response/soulArtifact/gradeUp/res';
import skillUpgrade from '../../src/response/skillBook/batchUpgrade/res';

import promotion from '../../src/response/promotion/perform/res';
import mining from '../../src/response/guild/mining/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => {
  mock.timers.reset();
  await shutdownLogger();
});

const cases = [
  { handler: mingwu, command: '/确认明悟丹 1 3', reason: '今日明悟丹剩余2次，无法服用3颗', commands: ['/储物袋 道具 丹药'] },
  { handler: mingwu, command: '/确认明悟丹 1', reason: '未找到该功法，请确认功法已装备', commands: ['/我的功法'] },
  { handler: mingwu, command: '/确认明悟丹 1', reason: '今日明悟丹使用次数已达上限(10/10)', commands: ['/我的功法'] },
  { handler: soulUpgrade, command: '/本命物升级 5', reason: '筑灵石不足', commands: ['/储物袋 材料 其它', '/珍宝楼'] },
  { handler: soulUpgrade, command: '/本命物升级', reason: '请先炼化本命物', commands: ['/储物袋 本命'] },
  { handler: soulUpgrade, command: '/本命物升级', reason: '当前等级 10 已达金丹上限 10', commands: ['/我的信息'] },
  { handler: soulGrade, command: '/本命物升品 1', reason: '珍宝楼上架中的本命物无法升品，请先下架', commands: ['/我的上架'] },
  { handler: skillUpgrade, command: '/升级功法 1 5', reason: '功法经验道具不足', commands: ['/储物袋 材料 经验材料'] },
  { handler: skillUpgrade, command: '/升级功法 1', reason: '灵石不足', commands: ['/我的信息'] },
  { handler: promotion, command: '/晋级', reason: '修为不足，无法晋级', commands: ['/闭关', '/查看主线'] },
  { handler: mining, command: '/宗门挖矿', reason: '你还未加入任何宗门', commands: ['/宗门列表'] }
];

for (const entry of cases) {
  for (const mode of ['http', 'feedback'] as const) {
    test(`${entry.command} ${mode} 失败保留原因和对应入口`, async t => {
      const { app, requests } = await gameFixture(
        t,
        request =>
          mode === 'http'
            ? { code: 'CONFLICT', message: entry.reason }
            : businessEnvelope(request.bid, undefined, [
                {
                  title: '操作未完成',
                  heading: '',
                  text: entry.reason,
                  buttons: [],
                  advice: [],
                  blocks: [{ text: entry.reason, quoted: false }]
                }
              ]),
        mode === 'http' ? 409 : 200
      );
      const result = await app.runHandler(entry.handler, app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }));
      assert.equal(requests.length, 1, '提示不重新发起写入');
      assert.ok(requests[0].idempotencyKey);
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      const view = inspectMessage(message.nodes);
      assert.ok(view.text.includes(entry.reason));
      assert.equal(view.text.split(entry.reason).length - 1, 1, 'text 和 blocks 不重复展示原因');
      for (const command of entry.commands) assert.ok(view.commands.includes(command), JSON.stringify(view));
      assert.ok(!view.commands.some(command => /^\/(本命物升级|升级功法|确认明悟丹)(\s|$)/.test(command)));
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    });
  }
}

for (const entry of [
  { count: 0, requested: 5, reason: '功法经验道具不足', commands: ['/储物袋 材料 经验材料'] },
  { count: 2, requested: 5, reason: '灵石不足', commands: ['/我的信息'] },
  { count: 0, requested: 1, reason: '该功法所有属性已达到上限，无法继续升级', commands: ['/我的功法'] },
  { count: 1, requested: 5, reason: '其他停止原因', commands: ['/我的功法'] },
  { count: 5, requested: 5, reason: '已达指定次数（5次）', commands: ['/升级功法 1 5'] }
]) {
  test(`批量升级成功响应中的停止原因：${entry.reason}`, async t => {
    const { app, requests } = await gameFixture(t, request =>
      businessEnvelope(request.bid, {
        mode: 'execute',
        result: {
          outcome: 'ok',
          target: { id: 1, name: '青木诀' },
          skillBookId: 1,
          successCount: entry.count,
          totalConsumedExp: entry.count * 100,
          totalConsumedSpiritStone: entry.count * 20,
          lastUpgradeCount: entry.count,
          attributeChanges: [],
          attributeLines: [],
          stopReason: entry.reason,
          upgradeCount: entry.requested
        }
      })
    );
    const result = await app.runHandler(skillUpgrade, app.events.groupMessage({ text: `/升级功法 1 ${entry.requested}`, platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(entry.reason));
    if (entry.count > 0) {
      assert.ok(view.text.includes(`连续升级 ${entry.count} 次`));
      assert.ok(view.text.includes(`消耗灵石: ${entry.count * 20}`));
    }
    for (const command of entry.commands) assert.ok(view.commands.includes(command), JSON.stringify(view));
    if (entry.count < entry.requested) assert.ok(!view.commands.some(command => command.startsWith('/升级功法 ')));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const actualLevels of [1, 5]) {
  test(`本命物完成 ${actualLevels}/5 级时按实际结果提供操作`, async t => {
    const { app, requests } = await gameFixture(t, request =>
      businessEnvelope(request.bid, {
        message: `本次成功提升${actualLevels}级`,
        result: {
          artifact: { id: 1, name: '青木剑', level: 1 + actualLevels },
          previousLevel: 1,
          actualLevels,
          cost: actualLevels * 100,
          comparison: [],
          compareLines: [],
          message: `本次成功提升${actualLevels}级`
        }
      })
    );
    const result = await app.runHandler(soulUpgrade, app.events.privateMessage({ text: '/本命物升级 5', platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    const view = inspectMessage(message.nodes);
    assert.ok(view.text.includes(`本次成功提升${actualLevels}级`));
    assert.equal(view.commands.includes('/本命物升级 5'), actualLevels === 5);
    if (actualLevels < 5) assert.ok(view.commands.includes('/储物袋 材料 其它'));
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  });
}



test('未知本命物失败保留原有按钮，移除重复升级动作', async t => {
  const { app } = await gameFixture(t, request =>
    businessEnvelope(request.bid, undefined, [
      {
        title: '本命物升级',
        heading: '',
        text: '暂时无法升级',
        buttons: [{ label: '储物袋', command: '/储物袋 本命' }],
        advice: []
      }
    ])
  );
  const result = await app.runHandler(soulUpgrade, app.events.privateMessage({ text: '/本命物升级', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.ok(view.commands.includes('/储物袋 本命'));
  assert.ok(view.commands.includes('/本命物信息'));
  assert.ok(!view.commands.some(command => command.startsWith('/本命物升级')));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});
