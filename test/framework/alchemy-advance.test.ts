import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import dashboard from '../../src/response/profession/myProfession/res';
import alchemy from '../../src/response/alchemy/v2/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

for (const command of ['/我的职业', '/我的洞府']) {
  for (const canAdvance of [true, false]) {
    test(`${command} 进阶入口跟随服务端资格且保持在引用块内 ${canAdvance}`, async t => {
      const data = {
        access: { canUseProfessionAndCave: true, canJoinAlchemyGuide: true, features: { alchemy: { realmReached: true, requiredRealm: '炼气九层', lockedReason: '' } } },
        alchemy: {
          unlocked: true, title: '', level: 6, exp: canAdvance ? 5010 : 4049, nextExpRequired: 4050, totalCrafts: 1145, learnedRecipeCount: 1,
          equipments: [], canAdvance, showSection: true, primaryAction: 'recipes', guide: { active: false, step: null, expiresAt: null, stepLabel: '' }
        },
        lingzhi: { unlocked: false, title: '', level: 0, exp: 0, nextExpRequired: null, dailyExpGained: 0, dailyExpCap: 0, maxPlots: 0, maxFieldGrade: 1, maxFieldGradeLabel: '凡阶', yieldBonus: 0, primaryAction: 'joinGuide' }
      };
      const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
      const result = await app.runHandler(dashboard, app.events.groupMessage({ text: command, platform: 'qq-bot' }));
      assert.equal(requests.length, 1);
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      const view = inspectMessage(message.nodes);
      assert.match(view.text, /等级：6/);
      assert.equal(view.commands.includes('/炼丹 进阶'), canAdvance);
      if (canAdvance) {
        const quotes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []).filter(node => node.type === 'MD.blockquote');
        assert.ok(quotes.some(node => Array.isArray(node.value) && inspectMessage([{ type: 'Markdown', value: node.value }]).commands.includes('/炼丹 进阶')));
        assert.match(view.text, /5010 \/ 4050/);
      }
    });
  }
}

for (const command of ['/炼丹师进阶', '/炼丹进阶', '/炼丹 进阶']) {
  test(`${command} 发送进阶请求并展示服务端余量`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      title: '炼丹', heading: '', text: '炼丹师：6级 → 7级\n剩余经验：960\n已结算原有经验，未消耗材料。', blocks: [],
      buttons: [{ label: '我的职业', command: '/我的职业' }], advice: []
    }));
    const result = await app.runHandler(alchemy, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].body.messageText, '/炼丹 进阶');
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.match(view.text, /剩余经验：960/);
    assert.ok(view.commands.includes('/我的职业'));
  });
}
