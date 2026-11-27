import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import loadoutHandler from '../../src/response/message/viewLoadout/res';
import router from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

const profile = { uid: 42, name: '青云', activeTitle: '无', realmName: '筑基初期' };
test('查看配装经过真实路由与候选按钮显示当前配装详情', async t => {
  const { app, requests } = await gameFixture(t, request => {
    const args = request.body.arguments as { target?: unknown };

    return businessEnvelope(request.bid, args.target ? {
      found: true,
      hideProfile: false,
      profile,
      loadout: {
        equipment: [{ slot: '武器', name: '青锋剑', grade: '玄品', set: '青锋套装', stats: [{ label: '物理攻击', value: 24 }, { label: '暴击率', value: 2.5, percent: true }] }],
        skillBooks: [{ slot: '主动', name: '御剑诀', grade: '玄品', cost: 16, cooldown: 2 }],
        soulArtifact: { name: '镇魂铃', grade: '一品', level: 12, category: '法宝', positioning: '护持', description: '守护神魂' }
      }
    } : { targetSuggestions: [42] });
  });
  app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'No mentions', [])]);
  await app.mount({ responseRouter: router });

  const candidates = await app.dispatch(app.events.privateMessage({ text: '/查看配装', platform: 'qq-bot' }));
  assert.deepEqual(candidates.errors, []);
  assert.ok(candidates.messages[0].commands.includes('/查看配装 42'));
  assert.ok(candidates.messages[0].commands.includes('/查看信息'));

  const result = await app.dispatch(app.events.interaction({ text: '/查看配装 42', platform: 'qq-bot', private: true }));
  assert.deepEqual(result.errors, []);
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.path === '/api/v2/robot/business/profile.loadout'));
  assert.deepEqual(requests[1].body.arguments, { target: { uid: 42 }, suggestTargets: true });
  const [message] = result.messages;
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  assert.match(message.text, /青锋剑 · 玄品/);
  assert.match(message.text, /青锋套装/);
  assert.match(message.text, /物理攻击 \+24 · 暴击率 \+2.5%/);
  assert.match(message.text, /御剑诀 · 玄品/);
  assert.match(message.text, /灵力消耗：16 · 冷却：2 回合/);
  assert.match(message.text, /镇魂铃 · 一品 · 12 级/);
  assert.match(message.text, /守护神魂/);
  assert.doesNotMatch(message.text, /战力：|战斗属性|回灵效率/);
  assert.ok(message.commands.includes('/查看信息 42'));
});

for (const hideProfile of [false, true]) {
  test(`查看配装 @ 道友展示${hideProfile ? '隐藏状态' : '空配装'}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, {
      found: true,
      hideProfile,
      profile,
      ...(hideProfile ? {} : { loadout: { equipment: [], skillBooks: [], soulArtifact: null } })
    }));
    app.actions.on('mention.get', () => [createResult(ResultCode.Ok, 'Target mention', [{ UserId: 'target-bid', IsBot: false }])]);
    const result = await app.runHandler(loadoutHandler, app.events.groupMessage({ text: '/查看配装', platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.deepEqual(requests[0].body.arguments, { target: { bid: 'target-bid' }, suggestTargets: true });
    const [message] = result.messages;
    assert.ok(message.commands.includes('/查看信息 42'));
    if (hideProfile) {
      assert.match(message.text, /已隐藏个人信息/);
      assert.doesNotMatch(message.text, /战力|物理攻击|装备：|功法：|本命物：/);
    } else {
      assert.match(message.text, /装备：未穿戴/);
      assert.match(message.text, /暂无可展示的装配功法/);
      assert.match(message.text, /本命物：未出战/);
    }
  });
}
