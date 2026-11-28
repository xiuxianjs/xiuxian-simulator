import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import router from '../../src/router';
import { ImageCache } from '../../src/utils/imageCdn';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

const panel = {
  daoName: '青岚', uid: 1, mid: '100001', realmName: '金丹初期', theme: null,
  maxAttributeBonus: 3, strength: 1480, maxStrength: 5350, intelligence: 169, maxIntelligence: 535,
  constitution: 157, maxConstitution: 535, agility: 1, maxAgility: 236, luck: 56, maxLuck: 535,
  combatPower: 1255, physicalAttack: 1616, physicalDefense: 844, magicAttack: 1679, magicDefense: 881,
  spiritualPower: 920, mentalPower: 100, hp: 341323, speed: 177, critRate: 20, critDamage: 164,
  antiCritRate: 0, hitRate: 0, dodgeRate: 0, mpRecoveryEfficiency: 5, mentalRecoveryEfficiency: 1234.56789,
  access: { canUseMeridian: true, canUseSoulArtifact: false, canUseSoulPath: true },
  resourceRecovery: { configured: true, enabled: true, cap: 100, mpTotal: 5, mentalTotal: 8, mp: 5, mental: 8, sources: [], note: '恢复效率说明' }
};
const image = 'https://offline.example.test/attribute-panel.png';

for (const mode of ['group', 'private', 'render-failed', 'send-failed', 'text', 'precise-text', 'missing-recovery'] as const) {
  test(`属性面板图片与文字路由 ${mode}`, async t => {
    const render = t.mock.method(ImageCache.prototype, 'getOrCreate', async () => mode === 'render-failed' ? null : image);
    const data = mode === 'text' ? {
      ...panel,
      mentalRecoveryEfficiency: 0,
      resourceRecovery: {
        ...panel.resourceRecovery, mental: 0, mentalTotal: 0, mpPerRound: 10.5, mentalPerRound: 0, mentalAvailable: false,
        sources: [
          {
            source: 'soul_artifact', templateId: 1, name: '混合本命物', mp: 5, mental: 8, pieces: 0, currentPieces: 0,
            active: true, status: 'active', statusText: '回灵已生效 · 回念元婴起生效', conditionText: '出战该本命物'
          },
          {
            source: 'skill_book', templateId: 2, name: '回念功法', mp: 0, mental: 6, pieces: 0, currentPieces: 0,
            active: false, status: 'mental_locked', statusText: '元婴起生效', conditionText: '装配到功法位'
          }
        ]
      }
    } : mode === 'missing-recovery' ? {
      ...panel, mpRecoveryEfficiency: undefined, mentalRecoveryEfficiency: undefined, resourceRecovery: undefined
    } : mode === 'precise-text' ? {
      ...panel, critRate: 0, hitRate: 4, mpRecoveryEfficiency: 5.1, mentalRecoveryEfficiency: 12.34567,
      criticalRates: { critRate: 0.29, critDamage: 164.5, antiCritRate: 0.006 }
    } : panel;
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data), 200, {}, 30000);
    await app.mount({ responseRouter: router });
    if (mode === 'send-failed') {
      app.actions.on('message.send', request => [
        createResult(request.payload.params.format?.some(node => node.type === 'Image') ? ResultCode.Fail : ResultCode.Ok, 'Test receipt', null)
      ]);
    }

    const textOnly = mode === 'text' || mode === 'precise-text' || mode === 'missing-recovery';
    const options = { text: textOnly ? '/属性面板' : '/属性面板图', platform: 'qq-bot' };
    const result = await app.dispatch(mode === 'private' ? app.events.privateMessage(options) : app.events.groupMessage(options));
    assert.equal(requests.filter(request => request.path.endsWith('/attributes.panel')).length, 1);
    assert.equal(render.mock.callCount(), textOnly ? 0 : 1);
    const attemptsImage = mode === 'group' || mode === 'private' || mode === 'send-failed';
    assert.equal(result.messages.length, attemptsImage ? 2 : 1);
    if (attemptsImage) {
      const first = result.messages[0];
      assert.deepEqual(first.nodes, [{ type: 'Image', value: image }]);
      assert.equal(result.actions[first.actionIndex].results?.[0].code, mode === 'send-failed' ? ResultCode.Fail : ResultCode.Ok);
    }
    const last = result.messages.at(-1)!;
    const controls = inspectMessage(last.nodes);
    assert.equal(result.actions[last.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.match(controls.text, mode === 'group' || mode === 'private' ? /属性面板操作/ : /战斗属性/);
    assert.doesNotMatch(controls.text, /每回合平均恢复|恢复效率说明|元婴起生效|混合本命物|回念功法/);
    if (mode === 'group' || mode === 'private') {
      assert.doesNotMatch(controls.text, /回灵效率|回念效率/);
    } else {
      const expectedMP = mode === 'missing-recovery' ? '0%' : mode === 'precise-text' ? '5.1%' : '5%';
      const expectedMental = mode === 'text' || mode === 'missing-recovery' ? '0%' : mode === 'precise-text' ? '12.35%' : '1,234.57%';
      assert.ok(controls.text.includes(`| 回灵效率 | ${expectedMP} | 回念效率 | ${expectedMental} |`));
      assert.equal(controls.text.match(/回灵效率/g)?.length, 1);
      assert.equal(controls.text.match(/回念效率/g)?.length, 1);
    }
    if (mode === 'precise-text') {
      assert.ok(controls.text.includes('| 暴击率 | 0.29% | 暴击伤害 | 164.5% |'));
      assert.ok(controls.text.includes('| 抗暴率 | 0.01% | 命中率 | 4% |'));
      assert.ok(controls.text.includes('| 闪避率 | 0% | | |'));
    }
    if (mode !== 'group' && mode !== 'private') {
      for (const text of [
        'MID：100001', '战力：1,255', '自由属性 · 上限加成 +3%',
        '力量（28%）　1,480 / 5,350', '智慧（32%）　169 / 535', '体质（29%）　157 / 535',
        '敏捷（1%）　1 / 236', '气运（10%）　56 / 535',
        '| 物理攻击 | 1,616 | 物理防御 | 844 |',
        '| 生命上限 | 34.13万 | 灵力上限 | 920 |'
      ]) {
        assert.ok(controls.text.includes(text), text);
      }
      assert.doesNotMatch(controls.text, /[▓░]/);
    }
    for (const command of ['/服用 培元丹 1', '/服用 培元丹 3', '/服用 培元丹 5', '/我的装备', '/我的功法', '/天师宝录', '/经络', '/道途印证']) {
      assert.ok(controls.commands.includes(command), command);
    }
    assert.ok(!controls.commands.includes('/我的本命物'));
  });
}
