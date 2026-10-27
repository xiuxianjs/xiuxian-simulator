import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { logger, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/skillBook/mySkillBooks/res';
import { getEventTransportDiagnosticContext } from '../../src/api/bot/context';
import { startTransportEvent } from '../../src/utils/transportTiming';
import { startFeatureVisibility } from '../../src/utils/featureVisibility';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const commands = Object.fromEntries(['我的功法', '我的隐藏功法', '属性面板', '切换战技', '切换神通', '切换被动技', '查看功法', '换下战技', '换下神通', '换下被动技', '战斗模板', '一键学习功法', '储物袋', '我', '战', '本', '动', '店'].map(command => [command, 'skills']));
const rules = { gateVersion: 1, commandFeatures: commands, intro: '', realmUnlocks: [], notes: [], featureCatalog: [{ stageLevel: 0, stageName: '', features: [{ id: 'skills', name: '', description: '', realm: '', realmReached: true, visible: true, conditions: [] }] }] };
const attributes = ['physicalAttack', 'magicAttack', 'physicalDefense', 'magicDefense', 'hp', 'physicalAttackPercent', 'magicAttackPercent', 'physicalDefensePercent', 'magicDefensePercent', 'hpPercent', 'speed', 'critRate', 'critDamage'];
const equipped = ['战技', '神通', '被动技'].map((skillType, i) => ({
  ...Object.fromEntries(attributes.flatMap(key => [[key, 0], [`max${key[0].toUpperCase()}${key.slice(1)}`, 0]])),
  id: i + 1, name: `本人工法${i}`, skillType, damageType: null, status: 3, statusText: '使用中', listText: '列表', slotText: `本人工法${i}（熟练度：100%）`, attributeSummary: '', canHide: false, canReset: false, isHidden: 0, upgradeCount: 0, proficiency: 100
}));

for (const privateChat of [false, true]) {
  test(`生产环境功法等待可关联到 HTTP、权限读取与发送，原气泡成功投递 private=${privateChat}`, async t => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    t.after(() => { if (originalEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalEnv; });
    const facts: Array<Record<string, unknown>> = [];
    t.mock.method(logger, 'info', (label: string, value: Record<string, unknown>) => {
      if (label === '[传输耗时]' || label === '[后端请求耗时]') facts.push(value);
    });
    let now = 0;
    t.mock.method(performance, 'now', () => now);
    const { app, requests } = await gameFixture(t, r => {
      if (r.path === '/api/v1/content/tianshu') return rules;
      if (r.path.includes('view=access')) { now += 700; return { gateVersion: 1, features: { skills: true } }; }
      now += 1500;
      return businessEnvelope(r.bid, { displayPage: 1, page: { inUseBooks: equipped, items: [], total: 7, totalPages: 2, currentPage: 1, pageSize: 5, proficiencyPoints: 41, canUseFifthLayerFeature: true } });
    });
    await app.invoke(app.events.groupMessage(), startFeatureVisibility);
    const event = privateChat ? app.events.privateMessage({ text: '/我的功法', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/我的功法', platform: 'qq-bot' });
    startTransportEvent(event);
    const result = await app.runHandler(handler, event);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.match(view.text, /持有熟练点：41/);
    for (let i = 1; i <= 3; i++) assert.ok(view.commands.includes(`/查看功法 ${i}`));
    assert.ok(view.commands.includes('/我的功法 2'));
    assert.equal(requests.filter(r => r.path.endsWith('/skill-books.learned')).length, 1);
    assert.equal(requests.filter(r => r.path.includes('view=access')).length, 1);
    assert.ok(!facts.some(f => f.operationId === 'post_v2_robot_business_operation'));
    const http = facts.find(f => f.stage === 'api.http.wait' && f.durationMs === 1500);
    const access = facts.find(f => f.stage === 'presentation.access');
    const send = facts.find(f => f.stage === 'platform.send');
    assert.equal(http?.durationMs, 1500);
    assert.equal(access?.durationMs, 700);
    assert.ok(send);
    assert.equal(send.elapsedFromEventStartMs, 2200);
    assert.equal(http.eventTraceId, access.eventTraceId);
    assert.equal(http.eventTraceId, send.eventTraceId);
    assert.ok(facts.some(f => f.stage === 'api.http.wait'));
    assert.ok(facts.every(f => f.commandKey === 'skill-books.learned'));
    assert.doesNotMatch(JSON.stringify(facts), /本人工法|offline-fixture-token|test-user|test-message|MessageText|UserId/);
  });
}

test('功法计时分类包含翻页和排序，不误认相似命令', () => {
  for (const MessageText of ['/我的功法', '/我的功法 2', '#我的功法 排序 物攻 升序 上限 3']) {
    assert.equal(getEventTransportDiagnosticContext({ MessageText })?.commandKey, 'skill-books.learned');
  }
  for (const MessageText of ['/我的功法其他', '/我的隐藏功法']) {
    assert.equal(getEventTransportDiagnosticContext({ MessageText })?.commandKey, 'unknown');
  }
});
