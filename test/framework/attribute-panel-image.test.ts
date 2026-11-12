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
  constitution: 157, maxConstitution: 535, agility: 118, maxAgility: 535, luck: 56, maxLuck: 535,
  combatPower: 1255, physicalAttack: 1616, physicalDefense: 844, magicAttack: 1679, magicDefense: 881,
  spiritualPower: 920, mentalPower: 100, hp: 5630, speed: 177, critRate: 20, critDamage: 164,
  antiCritRate: 0, hitRate: 0, dodgeRate: 0, mpRecoveryEfficiency: 5, mentalRecoveryEfficiency: 1234.56789,
  access: { canUseMeridian: true, canUseSoulArtifact: false, canUseSoulPath: true },
  resourceRecovery: { configured: true, enabled: true, cap: 100, mpTotal: 5, mentalTotal: 8, mp: 5, mental: 8, sources: [], note: '恢复效率说明' }
};
const image = 'https://offline.example.test/attribute-panel.png';

for (const mode of ['group', 'private', 'render-failed', 'send-failed', 'text'] as const) {
  test(`属性面板图片与文字路由 ${mode}`, async t => {
    const render = t.mock.method(ImageCache.prototype, 'getOrCreate', async () => mode === 'render-failed' ? null : image);
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, panel));
    await app.mount({ responseRouter: router });
    if (mode === 'send-failed') {
      app.actions.on('message.send', request => [
        createResult(request.payload.params.format?.some(node => node.type === 'Image') ? ResultCode.Fail : ResultCode.Ok, 'Test receipt', null)
      ]);
    }

    const options = { text: mode === 'text' ? '/属性面板' : '/属性面板图', platform: 'qq-bot' };
    const result = await app.dispatch(mode === 'private' ? app.events.privateMessage(options) : app.events.groupMessage(options));
    assert.equal(requests.filter(request => request.path.endsWith('/attributes.panel')).length, 1);
    assert.equal(render.mock.callCount(), mode === 'text' ? 0 : 1);
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
    assert.match(controls.text, /回灵效率：5%/);
    assert.match(controls.text, /回念效率：8%/);
    if (mode !== 'group' && mode !== 'private') {
      for (const text of ['MID：100001', '战力：1,255', '力量　1,480 / 5,350', '| 物理攻击 | 1,616 | 物理防御 | 844 |', '1,234.56789%']) {
        assert.ok(controls.text.includes(text), text);
      }
    }
    for (const command of ['/服用 培元丹 1', '/服用 培元丹 3', '/服用 培元丹 5', '/我的装备', '/我的功法', '/天师宝录', '/经络', '/道途印证']) {
      assert.ok(controls.commands.includes(command), command);
    }
    assert.ok(!controls.commands.includes('/我的本命物'));
  });
}
