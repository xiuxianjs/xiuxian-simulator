import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import handler from '../../src/response/guild/myGuild/res';
import upgradeVein from '../../src/response/guild/upgradeVein/res';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());
for (const state of ['ready', 'blocked', 'legacy', 'no-quota'] as const) {
  test(`宗门真实处理器展示升级成本和缺口：${state}`, async t => {
    const data = {
      hasGuild: true, access: { canCreateOrApplyGuild: true },
      membership: { guildId: 1, guildName: '青云门', roleName: '副宗主', isDeputy: false, canUpgrade: true, isLeader: false },
      guild: { level: 2, leader: { userId: 2, name: '宗主' }, spiritStone: 5, spiritStoneCap: 100, prestige: 4, prestigeCap: 100,
        veinLevel: 1, shopLevel: 1, viceLeaderCount: 1, viceLeaderLimit: 2, elderCount: 0, elderLimit: 2,
        memberCount: 3, memberCapacity: 20, minRealmName: null, notice: null, titles: [], shopAutoRefresh: { enabled: false, hours: [] },
        ...(state === 'legacy' ? {} : { upgrades: [{ kind: 'vein', currentLevel: 1, targetLevel: 2, prestigeCost: state === 'ready' ? 3 : 5,
          spiritStoneCost: state === 'ready' ? 4 : 6, prestigeMissing: state === 'ready' ? 0 : 1, spiritStoneMissing: state === 'ready' ? 0 : 1,
          status: state === 'no-quota' ? 'blocked' : state, reason: state === 'ready' ? '' : '宗门资源不足',
          ...(state === 'no-quota' ? {} : { miningQuota: { current: 25, target: 40 } }) }] }) },
      unlockLevels: { shop: 2, viceLeader: 2, elder: 2 }, pendingApplications: 0, storyline: { initialized: false, allCleared: false, stageIndex: null }
    };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const run = await app.runHandler(handler, app.events.groupMessage({ text: '/我的宗门 管理', platform: 'qq-bot' }));
    assert.equal(run.messages.length, 1);
    assert.equal(run.actions[run.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const text = run.messages[0].text;
    const nodes = JSON.stringify(run.messages[0].nodes);
    if (state === 'legacy') { assert.match(text, /升级条件暂不可用/); }
    else { assert.match(text, /等级：1 → 2/); assert.match(text, /消耗：宗门声望/); assert.match(text, /消耗：宗门灵石/); }
    assert.equal(text.includes('灵石收益：采矿每小时基础入池 25 → 40 灵石'), state === 'ready' || state === 'blocked');
    if (state === 'blocked') { assert.match(text, /还差：声望1、灵石1/); }
    assert.equal(nodes.includes('/提升宗门灵脉'), state === 'ready');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/api/v2/robot/business/guild.home');
  });
}


test('灵脉升级成功气泡保留服务端实际产量变化', async t => {
  const message = '【青云门】灵脉成功提升至2级！\n消耗：声望80，灵石4000\n灵石收益：采矿每小时基础入池 25 → 40 灵石';
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
    receipt: { guildId: 1, guildName: '青云门', kind: 'vein', level: 2, prestigeCost: 80, spiritStoneCost: 4000, message },
    message
  }));
  const run = await app.runHandler(upgradeVein, app.events.groupMessage({ text: '/提升宗门灵脉', platform: 'qq-bot' }));
  assert.equal(requests[0].path, '/api/v2/robot/business/guild.upgrade-vein');
  assert.equal(run.messages.length, 1);
  const sent = run.messages[0];
  assert.match(JSON.stringify(sent.nodes), /灵石收益：采矿每小时基础入池 25 → 40 灵石/);
  assert.equal(run.actions[sent.actionIndex].results?.[0].code, ResultCode.Ok);
});
