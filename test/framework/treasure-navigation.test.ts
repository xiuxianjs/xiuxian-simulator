import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import type { BackendAttributePanel } from '../../src/api/bot/attribute-panel';
import type { RobotActivityHub } from '../../src/api/bot/activity-hub';
import activity from '../../src/response/activity/res';
import attributes from '../../src/response/attributes/update/res';
import { businessEnvelope, gameFixture } from './fixture';

const panel: BackendAttributePanel = {
  uid: 1, daoName: '青云', realmName: '筑基', theme: null,
  access: { canUseMeridian: true, canUseSoulArtifact: true, canUseSoulPath: true },
  maxAttributeBonus: 0, strength: 5, maxStrength: 10, intelligence: 5, maxIntelligence: 10,
  constitution: 5, maxConstitution: 10, agility: 5, maxAgility: 10, luck: 5, maxLuck: 10,
  combatPower: 100, physicalAttack: 10, physicalDefense: 10, magicAttack: 10, magicDefense: 10,
  spiritualPower: 10, mentalPower: 10, hp: 10, speed: 10, critRate: 0, critDamage: 0,
  antiCritRate: 0, hitRate: 0, dodgeRate: 0
};
const hub: RobotActivityHub = {
  limitedEvent: { activeCount: 0 }, guildCompetition: { phase: 'INACTIVE' },
  guildSecretRealmWar: { phase: 'INACTIVE', activeStartAt: '', activeEndAt: '', maxAttackPerWeek: 0, remainingAttackCount: 0 },
  access: { hasGuild: false, canAccessOverseasIsland: false }, newcomerVisible: false, giftCodesVisible: false
};

after(async () => { await shutdownLogger(); });

test('宝物入口在属性面板页脚，上古遗珍仍在活动大厅', async t => {
  const { app } = await gameFixture(t, request =>
    businessEnvelope(request.bid, request.path.endsWith('/attributes.panel') ? panel : hub)
  );

  for (const makeEvent of [app.events.groupMessage, app.events.privateMessage]) {
    const activityResult = await app.runHandler(activity, makeEvent({ text: '/我的活动', platform: 'qq-bot' }));
    const panelResult = await app.runHandler(attributes, makeEvent({ text: '/属性面板', platform: 'qq-bot' }));

    for (const result of [activityResult, panelResult]) {
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    }

    const activityView = inspectMessage(activityResult.messages[0].nodes);
    assert.ok(activityView.commands.includes('/上古遗珍'));
    assert.ok(!activityView.commands.includes('/宝物'));

    const markdown = panelResult.messages[0].nodes.find(node => node.type === 'Markdown');
    assert.ok(markdown);
    const footerCommands = markdown.value.flatMap(node => node.type === 'MD.button' ? [node.options?.data] : []);
    assert.deepEqual(footerCommands, ['/我的装备', '/我的功法', '/宝物', '/天师宝录', '/我的本命物', '/道途印证', '/经络']);
  }
});
