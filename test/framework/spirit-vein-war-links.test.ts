import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import home from '../../src/response/guildSecretRealmWar/home/res';
import list from '../../src/response/guildSecretRealmWar/list/res';
import view from '../../src/response/guildSecretRealmWar/view/res';
import challenge from '../../src/response/guildSecretRealmWar/challenge/res';
import claim from '../../src/response/guildSecretRealmWar/claim/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const homeData = {
  isActive: true, activeStart: '周六20:00', activeEnd: '周六21:00', attackUsed: 2, maxAttack: 5,
  guildId: 1, guildName: '青云宗', joinAt: '2026-10-01T00:00:00Z', memberRoleName: '弟子',
  display: {
    statusLabel: '进行中', attackRemaining: 3, membershipNotice: '', participationNotice: '本周首次有效占领奖励贡献。',
    activeOwnedText: '高阶1座', outputMultiplierText: '1.10', settledOwnedText: '低阶2座', rewardText: '240', canPromptClaim: true
  }
};
const realms = Array.from({ length: 5 }, (_, i) => ({ realmNo: 6 + i, name: `灵脉秘境${6 + i}`, tier: 'HIGH', winnerGuildName: '青云宗', winnerPoints: 30 + i }));
const positions = Array.from({ length: 5 }, (_, i) => ({ positionNo: 6 + i, positionPoints: 10 + i, npcId: 99 + i, occupiedUserName: i === 0 ? '守脉修士' : null }));
const challengeData = { won: true, realmNo: 6, positionNo: 6, participationContribution: 100, frozenUntil: '2026-11-07T13:00:00Z' };
const claimData = { spiritCrystal: 240, contribution: 30, reputation: 10, ownedRealms: 2, reputationAlreadyClaimed: false };

const flatten = (nodes: readonly any[]): any[] => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
const buttons = (nodes: readonly any[]) => flatten(nodes).filter(node => node.type === 'MD.button');

for (const isPrivate of [false, true]) {
  test(`灵脉攻防战查看和挑战蓝链可往返且不自动发送 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid,
      request.path.endsWith('secret-realm.list') ? realms : request.path.endsWith('secret-realm.view') ? positions : challengeData));
    const event = (text: string) => isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const listed = await app.runHandler(list, event('/灵脉攻防战列表 2'));
    assert.deepEqual(listed.errors, []);
    assert.equal(listed.messages.length, 1);
    assert.equal(listed.actions[listed.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const listedView = inspectMessage(listed.messages[0].nodes);
    assert.ok(listedView.text.includes('灵脉秘境6'));
    assert.ok(listedView.text.includes('领先：青云宗 30分'));
    for (const command of ['/灵脉攻防战查看 6 1', '/灵脉攻防战列表 1', '/灵脉攻防战列表 3']) assert.ok(listedView.commands.includes(command));
    const selectedRealm = buttons(listed.messages[0].nodes).find(node => node.options.data === '/灵脉攻防战查看 6 1');
    assert.ok(selectedRealm);
    const viewed = await app.runHandler(view, event(selectedRealm.options.data));
    assert.deepEqual(requests[1].body.arguments, { realmNo: '6', page: '1' });
    const viewedView = inspectMessage(viewed.messages[0].nodes);
    assert.ok(viewedView.text.includes('占领：守脉修士'));
    assert.ok(viewedView.text.includes('占领：NPC#100'));
    assert.ok(viewedView.commands.includes('/灵脉攻防战查看 6 2'));
    const selectedPosition = buttons(viewed.messages[0].nodes).find(node => node.options.data === '/灵脉攻防战挑战 6 6');
    assert.ok(selectedPosition);
    const challenged = await app.runHandler(challenge, event(selectedPosition.options.data));
    assert.deepEqual(requests[2].body.arguments, { realmNo: '6', positionNo: '6' });
    assert.ok(inspectMessage(challenged.messages[0].nodes).text.includes('挑战胜利，已占领该位置。'));
    for (const result of [listed, viewed, challenged]) {
      const sent = result.messages[0];
      assert.equal(result.actions[sent.actionIndex].results?.[0].code, ResultCode.Ok);
      for (const button of buttons(sent.nodes)) {
        assert.equal(button.options.autoEnter, false);
        assert.equal(button.options.show, undefined);
        assert.ok([...button.options.data].length <= 80);
      }
    }
    assert.equal(requests.length, 3);
  });

  test(`灵脉攻防战领奖蓝链仅在可领时显示并保留领取回执 private=${isPrivate}`, async t => {
    let canClaim = true;
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid,
      request.path.endsWith('secret-realm.claim') ? claimData : { ...homeData, display: { ...homeData.display, canPromptClaim: canClaim } }));
    const event = (text: string) => isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
    const shown = await app.runHandler(home, event('/灵脉攻防战'));
    const claimButton = buttons(shown.messages[0].nodes).find(node => node.options.data === '/灵脉攻防战领取奖励');
    assert.ok(claimButton);
    assert.equal(claimButton.options.autoEnter, false);
    assert.equal(claimButton.options.show, undefined);
    const claimed = await app.runHandler(claim, event(claimButton.options.data));
    assert.ok(inspectMessage(claimed.messages[0].nodes).text.includes('领取成功：灵晶240 ｜ 贡献30 ｜ 宗门声望10'));
    assert.deepEqual(requests[1].body.arguments, {});
    canClaim = false;
    const hidden = await app.runHandler(home, event('/灵脉攻防战'));
    assert.ok(!inspectMessage(hidden.messages[0].nodes).commands.includes('/灵脉攻防战领取奖励'));
    for (const result of [shown, claimed, hidden]) assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

for (const kind of ['list', 'view'] as const) {
  test(`灵脉攻防战${kind}空页保留上一页且不显示伪操作`, async t => {
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, []));
    const text = kind === 'list' ? '/灵脉攻防战列表 2' : '/灵脉攻防战查看 6 2';
    const result = await app.runHandler(kind === 'list' ? list : view, app.events.privateMessage({ text, platform: 'qq-bot' }));
    const parsed = inspectMessage(result.messages[0].nodes);
    assert.ok(parsed.text.includes('本页暂无'));
    assert.ok(parsed.commands.includes(kind === 'list' ? '/灵脉攻防战列表 1' : '/灵脉攻防战查看 6 1'));
    assert.ok(!parsed.commands.some(command => /挑战|查看 null/.test(command)));
    assert.ok(!parsed.commands.includes(kind === 'list' ? '/灵脉攻防战列表 3' : '/灵脉攻防战查看 6 3'));
  });
}

test('灵脉攻防战保留服务端原拒绝并提供攻防列表蓝链', async t => {
  const reason = '用法：/灵脉攻防战查看 秘境编号 [页码]';
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: [] }]));
  const result = await app.runHandler(view, app.events.privateMessage({ text: '/灵脉攻防战查看', platform: 'qq-bot' }));
  assert.deepEqual(requests[0].body.arguments, { realmNo: null, page: '1' });
  const parsed = inspectMessage(result.messages[0].nodes);
  assert.ok(parsed.text.includes(reason));
  assert.ok(parsed.commands.includes('/灵脉攻防战列表 1'));
  assert.ok(!parsed.commands.some(command => command.includes('null')));
});
