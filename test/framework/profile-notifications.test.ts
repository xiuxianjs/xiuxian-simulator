import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/message/me/res';
import { validateHomeNotifications } from '../../src/api/bot/home-notification-queries';
import { businessEnvelope, gameFixture } from './fixture';

// createTestApp owns the framework clock; freeze native delayed platform hooks separately.
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const resource = { current: 10, cap: 100, regenIntervalMinutes: 5 };
const access = Object.fromEntries(['canUseSecondLayerFeature', 'canUseFifthLayerFeature', 'canUseSpar', 'canUseMeridian', 'canUseProfessionAndCave', 'canUseSoulArtifact', 'canUseSoulPath', 'canAdvanceSoulArtifact', 'canJoinAlchemyGuide', 'canUseRobberyLikePvp', 'canJoinMasterAsDisciple', 'canAcceptDisciple'].map(key => [key, true]));
const profile = {
  found: true, user: { id: 1, name: '测试道友', gender: 1, signature: '', experience: 10, qiValue: 10, mentalValue: 10, realmId: 1, createdAt: null, lastCheckInTime: null },
  realm: null, title: null, themeConfig: null, foundationPrefix: null, mental: resource, qi: resource, access,
  homeView: { realmName: '炼气', experienceText: '10', qiRecoverText: '恢复中', mentalRecoverText: '恢复中', isEarlyStarter: false },
  isNewcomer: false, canStoreGreenBottle: false, absenceDays: null, combatPower: 20
};

for (const privateChat of [false, true]) {
  test(`资料页按服务端事实展示飞信和未送达通知，零计数时移除入口（${privateChat ? '私聊' : '群聊'}）`, async t => {
    let pending = true;
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, {
      profile,
      notifications: pending ? [{ type: 'UNREAD_EMAIL', count: 1 }, { type: 'UNREAD_FLYMAIL', count: 3 }, { type: 'UNDELIVERED_NOTIFICATION', count: 2 }] : [],
      atmosphere: { text: null, kind: 'none' }
    }));
    const event = () => privateChat ? app.events.privateMessage({ text: '/我的资料', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/我的资料', platform: 'qq-bot' });
    const result = await app.runHandler(handler, event());
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.match(view.text, /未读飞信 3/);
    assert.match(view.text, /未送达通知 2/);
    assert.ok(view.commands.includes('/飞信'));
    assert.ok(view.commands.includes('/我的通知'));
    assert.ok(view.commands.includes('/我的邮件'));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/api/v2/robot/home-overview');
    pending = false;
    const cleared = await app.runHandler(handler, event());
    assert.equal(cleared.actions[cleared.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const empty = inspectMessage(cleared.messages[0].nodes);
    assert.doesNotMatch(empty.text, /未读飞信|未送达通知/);
    assert.ok(!empty.commands.includes('/我的通知'));
  });
}

test('主页通知契约允许新增类型，同时保持旧顺序、非零计数与去重校验', () => {
  const items = [{ type: 'UNREAD_EMAIL', count: 1 }, { type: 'UNREAD_FLYMAIL', count: 3 }, { type: 'UNDELIVERED_NOTIFICATION', count: 2 }];
  assert.deepEqual(validateHomeNotifications(items), items);
  assert.throws(() => validateHomeNotifications([...items].reverse()));
  assert.throws(() => validateHomeNotifications([{ type: 'UNREAD_FLYMAIL', count: 0 }]));
  assert.throws(() => validateHomeNotifications([items[1], items[1]]));
});

test('仅开放队伍飞信时，未读入口直接进入队伍，避免落到未开放的好友页', async t => {
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, {
    profile: { ...profile, access: { ...access, canUseFifthLayerFeature: false } },
    notifications: [{ type: 'UNREAD_FLYMAIL', count: 1 }], atmosphere: { text: null, kind: 'none' }
  }));
  const result = await app.runHandler(handler, app.events.groupMessage({ text: '/我的资料', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, /未读飞信 1/);
  assert.ok(view.commands.includes('/飞信 队伍'));
  assert.ok(!view.commands.includes('/飞信'));
});

for (const guildName of ['青云宗', null, undefined]) {
  test(`资料页显示宗门且只请求一次主页：${String(guildName)}`, async t => {
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, {
      profile, guildName, notifications: [], atmosphere: { text: null, kind: 'none' }
    }));
    const result = await app.runHandler(handler, app.events.groupMessage({ text: '/我的资料', platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    if (guildName === undefined) {
      assert.doesNotMatch(view.text, /宗门：/);
    } else {
      assert.ok(view.text.includes(`宗门：${guildName ?? '无'}`));
    }
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/api/v2/robot/home-overview');
  });
}

for (const privateChat of [false, true]) {
  for (const active of [true, false, undefined]) {
    test(`资料道号仅为有效月卡输出QQ彩色字：私聊=${privateChat}，月卡=${String(active)}`, async t => {
      const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, {
        profile: { ...profile, homeView: { ...profile.homeView, hasMonthCard: active } },
        notifications: [], atmosphere: { text: null, kind: 'none' }
      }));
      const input = { text: '/我的资料', platform: 'qq-bot' };
      const result = await app.runHandler(handler, privateChat ? app.events.privateMessage(input) : app.events.groupMessage(input));
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1);
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      const nodes = JSON.stringify(result.messages[0].nodes);
      if (active) {
        for (const [color, letter] of [['#FF3333', '测'], ['#FF7733', '试'], ['#FFDD33', '道'], ['#AAFF33', '友']]) {
          assert.ok(nodes.includes(JSON.stringify(`\\color{${color}}{\\text{${letter}}}`).slice(1, -1)), nodes);
        }
      } else {
        assert.doesNotMatch(nodes, /textcolor|\\\\color\{/);
        assert.match(inspectMessage(result.messages[0].nodes).text, /道号：测试道友/);
      }
      assert.ok(inspectMessage(result.messages[0].nodes).commands.includes('/改名 测试道友'));
      assert.equal(requests.length, 1);
    });
  }
}

test('彩色道号转义公式字符，不拆开组合emoji，也不改动改名参数', async t => {
  const name = 'A$\\{👩‍🚀';
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, {
    profile: { ...profile, user: { ...profile.user, name }, homeView: { ...profile.homeView, hasMonthCard: true } },
    notifications: [], atmosphere: { text: null, kind: 'none' }
  }));
  const result = await app.runHandler(handler, app.events.groupMessage({ text: '/我的资料', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const raw = JSON.stringify(result.messages[0].nodes);
  assert.ok(raw.includes(JSON.stringify('\\text{👩‍🚀}').slice(1, -1)));
  assert.ok(raw.includes(JSON.stringify('\\text{\\$}').slice(1, -1)));
  assert.ok(raw.includes(JSON.stringify('\\text{\\textbackslash{}}').slice(1, -1)));
  assert.ok(inspectMessage(result.messages[0].nodes).commands.includes(`/改名 ${name}`));
});

test('非QQ平台的月卡用户保留普通道号', async t => {
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, {
    profile: { ...profile, homeView: { ...profile.homeView, hasMonthCard: true } },
    notifications: [], atmosphere: { text: null, kind: 'none' }
  }));
  const result = await app.runHandler(handler, app.events.groupMessage({ text: '/我的资料', platform: 'onebot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.doesNotMatch(JSON.stringify(result.messages[0].nodes), /textcolor|\\\\color\{/);
  assert.match(inspectMessage(result.messages[0].nodes).text, /道号：测试道友/);
});
