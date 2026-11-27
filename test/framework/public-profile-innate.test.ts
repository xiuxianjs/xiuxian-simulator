import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { battlePanelKeys } from '../../src/api/bot/battle-panel-numbers';
import handler from '../../src/response/message/viewInfo/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
for (const state of ['public', 'hidden', 'ungranted', 'legacy', 'self']) {
  test(`他人资料天赋灵根 ${state}`, async t => {
    const granted = state !== 'ungranted';
    const talents = { granted, rulesVersion: 1, talents: granted ? ['修行', '生活', '战斗'].map((category, i) => ({ code: `t${i}`, name: `目标天赋${i}`, category, description: `目标效果${i}`, enabled: i !== 2, implemented: true })) : [] };
    const spiritRoot = { granted, title: '目标灵根', qualityName: '玄品', quality: 1, cultivation: 0, stagePoints: 0, stageTarget: 100, overflow: 0, bonusPercent: 10, nextBonusPercent: 20, nextQualityName: '', requiredRealmName: '', canFeed: false, canPromote: false, meditationActive: false, activeMeditationBonusPercent: 0, message: '' };
    const combatPanel = { ...Object.fromEntries(battlePanelKeys.map((key, i) => [key, i + 1])), mpRecoveryEfficiency: 0, mentalRecoveryEfficiency: 12.5 };
    const detail = { strength: 1, intelligence: 2, constitution: 3, agility: 4, luck: 5, battle: { physicalAttack: 1, physicalDefense: 2, magicAttack: 3, magicDefense: 4, hp: 5, speed: 6, critRate: 7, critDamage: 8 }, ...(state === 'legacy' ? {} : { talents, spiritRoot, combatPanel }) };
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { found: true, hideProfile: state === 'hidden', profile: { uid: 42, name: '对方', activeTitle: '无', realmName: '炼气' }, cave: { relation: state === 'self' ? 'self' : 'stranger', relationLabel: state === 'self' ? '本人' : '陌生人', canViewAura: true, blockedByFormation: false, auraText: '稀薄', summary: '' }, ...(state === 'hidden' ? {} : { detail }) }));
    const result = await app.runHandler(handler, app.events.groupMessage({ text: '/查看信息 42', platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.deepEqual((requests[0].body.arguments as any).target, { uid: 42 });
    assert.equal(view.commands.includes('/查看配装 42'), state !== 'hidden');
    assert.equal(view.commands.includes('/我的信息'), false);
    assert.deepEqual(view.commands.filter(command => /^\/(打劫|比试) /.test(command)), state === 'self' ? [] : ['/打劫 42', '/比试 42']);
    if (state === 'hidden') {
      assert.doesNotMatch(view.text, /战斗属性|物理攻击|暴击伤害/);
    } else {
      assert.match(view.text, /战斗属性/);
      assert.match(view.text, /物理攻击 \|/);
      if (state !== 'legacy') {
        assert.match(view.text, /回灵效率 \| 0% \| 回念效率 \| 12\.5%/);
      }
    }
    if (state === 'public' || state === 'self') {
      assert.match(view.text, /灵根：目标灵根 · 玄品/);
      assert.match(view.text, /天赋：目标天赋0 · 修行/);
      assert.match(view.text, /效果：目标效果2/);
      assert.match(view.text, /状态：暂未开启/);
    } else if (state === 'ungranted') {
      assert.match(view.text, /灵根：尚未发放/);
      assert.match(view.text, /天赋：尚未发放/);
    } else {
      assert.doesNotMatch(view.text, /灵根：|天赋：/);
    }
  });
}
