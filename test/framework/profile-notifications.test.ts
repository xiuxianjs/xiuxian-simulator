import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { startFeatureVisibility } from '../../src/utils/featureVisibility';
import activity from '../../src/response/activity/res';
import router from '../../src/router';
import handler from '../../src/response/message/me/res';
import readAllHandler from '../../src/response/notification/read-all/res';
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
    const { app, requests } = await gameFixture(t, r => {
      if (r.path.endsWith('/online-encounter.check')) {
        const tomorrow = new Date(Date.now() + 86400000).toISOString();
        return businessEnvelope(r.bid, { triggered: false, pending: null, quotaExhausted: false, nextCheckAt: tomorrow, nextGameDayAt: tomorrow });
      }
      if (r.path.endsWith('/notifications.mark-all-read')) {
        pending = false;
        return businessEnvelope(r.bid, { count: 6 });
      }

      return businessEnvelope(r.bid, {
        profile: {
          ...profile,
          user: { ...profile.user, experience: 1199586 },
          realm: { id: 1, name: '炼气', level: 1, stageLevel: 1, experienceLimit: 2368000 },
          homeView: { ...profile.homeView, experienceText: '1.199586e+06/2.368e+06' }
        },
        notifications: pending ? [{ type: 'UNREAD_EMAIL', count: 1 }, { type: 'UNREAD_FLYMAIL', count: 3 }, { type: 'UNDELIVERED_NOTIFICATION', count: 2 }] : [],
        atmosphere: { text: null, kind: 'none' }
      });
    });
    await app.mount({ responseRouter: router });
    const event = () => privateChat ? app.events.privateMessage({ text: '/我的信息', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/我的资料', platform: 'qq-bot' });
    const result = await app.dispatch(event());
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.match(view.text, /修为：119\.96万 \/ 236\.8万/);
    assert.ok(view.commands.includes('/服用 聚灵丹 1'));
    assert.match(view.text, /未读飞信 3/);
    assert.match(view.text, /未送达通知 2/);
    assert.ok(view.commands.includes('/飞信'));
    assert.ok(view.commands.includes('/我的通知'));
    assert.ok(view.commands.includes('/我的邮件'));
    assert.deepEqual(requests.filter(r => !r.path.endsWith('/online-encounter.check')).map(r => r.path), ['/api/v2/robot/home-overview']);
    const nodes = result.messages[0].nodes.flatMap(node => node.type === 'Markdown' ? node.value : [])
      .flatMap(node => node.type === 'MD.blockquote' && Array.isArray(node.value) ? node.value : [node]);
    const command = view.commands.find(value => value === '/一键通知已读');
    assert.ok(command);
    assert.ok(nodes.some(node => node.type === 'MD.button' && node.options?.data === command && node.options.autoEnter === false));
    const input = { text: command, platform: 'qq-bot' };
    const receipt = await app.runHandler(readAllHandler, privateChat ? app.events.privateMessage(input) : app.events.groupMessage(input));
    assert.deepEqual(receipt.errors, []);
    assert.equal(receipt.actions[receipt.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    assert.match(inspectMessage(receipt.messages[0].nodes).text, /已将 6 条通知标记为已读/);
    assert.equal(requests.at(-1)?.path, '/api/v2/robot/business/notifications.mark-all-read');
    const cleared = await app.runHandler(handler, event());
    assert.equal(cleared.actions[cleared.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const empty = inspectMessage(cleared.messages[0].nodes);
    assert.doesNotMatch(empty.text, /未读飞信|未送达通知/);
    assert.ok(!empty.commands.includes('/我的通知'));
    assert.ok(!empty.commands.includes('/一键通知已读'));
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
  assert.ok(view.commands.includes('/一键通知已读'));
});

for (const { guildName, guildId, privateChat, canJoin } of [
  { guildName: '青云宗', guildId: 10, privateChat: false, canJoin: true },
  { guildName: '青云宗', guildId: 10, privateChat: true, canJoin: false },
  { guildName: '青云宗', guildId: undefined, privateChat: false, canJoin: false },
  { guildName: '青云宗', guildId: '占位输入', privateChat: false, canJoin: false },
  { guildName: null, guildId: undefined, privateChat: false, canJoin: false },
  { guildName: undefined, guildId: undefined, privateChat: false, canJoin: false }
]) {
  test(`资料宗门入口校验数字编号和会话：${String(guildName)} / ${String(guildId)} / 私聊=${privateChat}`, async t => {
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, {
      profile, guildName, guildId, notifications: [], atmosphere: { text: null, kind: 'none' }
    }));
    const input = { text: '/我的资料', platform: 'qq-bot' };
    const result = await app.runHandler(handler, privateChat ? app.events.privateMessage(input) : app.events.groupMessage(input));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    if (guildName === undefined) {
      assert.doesNotMatch(view.text, /宗门：/);
    } else {
      assert.ok(view.text.includes(`宗门：${guildName ?? '无'}`));
    }
    const markdown = result.messages[0].nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
    const guildLine = markdown.findIndex(node => node.type === 'MD.text' && node.value.startsWith('宗门：'));
    const joinIndex = markdown.findIndex(node => node.type === 'MD.button' && node.options?.data?.startsWith('/加入宗门'));
    if (canJoin) {
      assert.ok(joinIndex > guildLine && guildLine >= 0);
      assert.ok(!markdown.slice(guildLine + 1, joinIndex).some(node => node.type === 'MD.newline'));
      const button = markdown[joinIndex];
      assert.ok(button.type === 'MD.button');
      assert.equal(button.options?.data, '/加入宗门 10');
      assert.equal(button.options?.autoEnter, false);
    } else {
      assert.equal(joinIndex, -1);
    }
    assert.equal(requests.filter(r => !r.path.endsWith('/online-encounter.check')).length, 1);
    assert.equal(requests[0].path, '/api/v2/robot/home-overview');
  });
}

for (const privateChat of [false, true]) {
  for (const active of [true, false, undefined]) {
    test(`资料不输出 QQ Markdown 不支持的 LaTeX 彩色字：私聊=${privateChat}，月卡=${String(active)}`, async t => {
      const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, {
        profile: { ...profile, homeView: { ...profile.homeView, hasMonthCard: active } },
        notifications: [], atmosphere: { text: null, kind: 'none' }
      }));
      const input = { text: '/我的资料', platform: 'qq-bot' };
      const result = await app.runHandler(handler, privateChat ? app.events.privateMessage(input) : app.events.groupMessage(input));
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1);
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      const view = inspectMessage(result.messages[0].nodes);
      const nodes = JSON.stringify(result.messages[0].nodes);
      // QQ 官方 Markdown 只支持标题/样式/链接/图片/列表/引用/分割线，公式会原样显示为乱码。
      assert.doesNotMatch(nodes, /textcolor|\\\\color\{|\\\\text\{/, nodes);
      assert.match(view.text, /UID：1 /);
      assert.match(view.text, /道号：测试道友/);
      assert.ok(view.commands.includes('/改名 测试道友'));
      assert.equal(requests.filter(r => !r.path.endsWith('/online-encounter.check')).length, 1);
    });
  }
}

test('道号按普通文本展示，不生成 LaTeX 节点，也不改动改名参数', async t => {
  const name = 'A$\\{👩‍🚀';
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, {
    profile: { ...profile, user: { ...profile.user, name }, homeView: { ...profile.homeView, hasMonthCard: true } },
    notifications: [], atmosphere: { text: null, kind: 'none' }
  }));
  const result = await app.runHandler(handler, app.events.groupMessage({ text: '/我的资料', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(result.messages[0].nodes);
  assert.doesNotMatch(JSON.stringify(result.messages[0].nodes), /\\\\color\{|\\\\text\{/);
  assert.ok(view.text.includes(name));
  assert.ok(view.commands.includes(`/改名 ${name}`));
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

for (const privateChat of [false, true]) {
  for (const signature of ['仙之巅傲世间，有我柠檬才有天！', '', '  ']) {
    test(`资料签名按内容展示（${privateChat ? '私聊' : '群聊'}，${JSON.stringify(signature)}）`, async t => {
      const { app } = await gameFixture(t, r => businessEnvelope(r.bid, {
        profile: { ...profile, user: { ...profile.user, signature } },
        notifications: [], atmosphere: { text: null, kind: 'none' }
      }));
      const input = { text: '/我的资料', platform: 'qq-bot' };
      const result = await app.runHandler(handler, privateChat ? app.events.privateMessage(input) : app.events.groupMessage(input));
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1);
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      const view = inspectMessage(result.messages[0].nodes);
      const markdownNodes = result.messages[0].nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
      const signatureQuotes = markdownNodes.filter(node => node.type === 'MD.blockquote' && Array.isArray(node.value) &&
        node.value.some(child => child.type === 'MD.text' && child.value === signature));
      assert.equal(signatureQuotes.length, signature.trim() ? 1 : 0);
      const powerIndex = markdownNodes.findIndex(node => node.type === 'MD.text' && node.value.startsWith('战力：'));
      assert.ok(powerIndex > 1);
      assert.equal(markdownNodes[powerIndex - 1].type, signature.trim() ? 'MD.blockquote' : 'MD.newline');
      if (!signature.trim()) assert.notEqual(markdownNodes[powerIndex - 2].type, 'MD.newline');
      assert.equal(markdownNodes.filter(node => node.type === 'MD.blockquote').length, signature.trim() ? 1 : 0);
      assert.ok(!markdownNodes.some(node => node.type === 'MD.text' && node.value === signature));
      assert.doesNotMatch(view.text, /(?:个性|个人)签名：|上限：50字|保存前需通过 AI 审核/);
      const editButton = result.messages[0].nodes
        .flatMap(node => node.type === 'Markdown' ? node.value : [])
        .find(node => node.type === 'MD.button' && node.options?.data === '/改签名 ');
      assert.ok(editButton?.type === 'MD.button');
      assert.equal(editButton.options?.autoEnter, false);
    });
  }
}

test('主页优先展示 MID，未绑定时回退 UID，交互按钮使用数字 UID', async t => {
  let mid: string | undefined = 'QX000888';
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, {
    profile: { ...profile, user: { ...profile.user, mid } },
    notifications: [], atmosphere: { text: null, kind: 'none' }
  }));
  for (const expected of ['MID：QX000888', 'UID：1']) {
    const result = await app.runHandler(handler, app.events.groupMessage({ text: '/我的资料', platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.indexOf('道号：测试道友') < view.text.indexOf(expected));
    assert.ok(view.text.indexOf(expected) < view.text.indexOf('境界：炼气'));
    if (mid) assert.doesNotMatch(view.text, /UID：1/);
    assert.ok(view.commands.includes('/拜师 1'));
    mid = undefined;
  }
});

for (const mode of ['combined', 'legacy', 'malformed'] as const) {
  test(`资料气泡复用当前事件的权限并兼容旧回包 (${mode})`, async t => {
    const features = { profile: true, bag: true, locked: false };
    const { app, requests } = await gameFixture(t, request => {
      if (request.path.endsWith('?view=access')) return { gateVersion: 1, features };
      if (request.path.endsWith('/content/tianshu')) return {
        gateVersion: 1, intro: '', realmUnlocks: [], notes: [],
        commandFeatures: { 储物袋: 'bag', 我的邮件: 'locked', 我的资料: 'profile' },
        featureCatalog: [{ stageLevel: 0, stageName: '', features: Object.keys(features).map(id => ({
          id, name: id, realm: '', description: '', realmReached: true, visible: true, conditions: []
        })) }]
      };
      if (request.path.endsWith('/online-encounter.check')) {
        const tomorrow = new Date(Date.now() + 86400000).toISOString();
        return businessEnvelope(request.bid, { triggered: false, pending: null, quotaExhausted: false, nextCheckAt: tomorrow, nextGameDayAt: tomorrow });
      }
      return businessEnvelope(request.bid, {
        profile,
        notifications: [{ type: 'UNREAD_EMAIL', count: 1 }],
        atmosphere: { text: null, kind: 'none' },
        ...(mode === 'legacy' ? {} : { presentationAccess: { gateVersion: 1, features: mode === 'combined' ? features : { bag: 'true' } } })
      });
    });
    await app.invoke(app.events.groupMessage(), startFeatureVisibility);
    for (let i = 0; i < 2; i++) {
      const result = await app.runHandler(handler, app.events.groupMessage({
        text: '/我的资料', platform: 'qq-bot', userId: 'profile-' + i, messageId: 'profile-' + i
      }));
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1);
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      const view = inspectMessage(result.messages[0].nodes);
      assert.ok(view.commands.includes('/储物袋'));
      assert.ok(!view.commands.includes('/我的邮件'));
    }
    assert.equal(requests.filter(r => r.path.endsWith('/home-overview')).length, 2);
    assert.equal(requests.filter(r => r.path.endsWith('?view=access')).length, mode === 'combined' ? 0 : 2);
  });
}

test('个人活动保留新人狂欢和回归活动，资料页不展示这两个入口', async t => {
  const { app, requests } = await gameFixture(t, r => {
    const features = { comeback: true, newcomer: true };
    if (r.path.endsWith('?view=access')) return { gateVersion: 1, features };
    if (r.path.endsWith('/content/tianshu')) return {
      gateVersion: 1, intro: '', realmUnlocks: [], notes: [],
      commandFeatures: { 回归奖励: 'comeback', 新人狂欢: 'newcomer' },
      featureCatalog: [{ stageLevel: 0, stageName: '', features: Object.keys(features).map(id => ({
        id, name: id, realm: '', description: '', realmReached: true, visible: true, conditions: []
      })) }]
    };
    if (r.path.endsWith('/native-comeback.overview')) {
      return businessEnvelope(r.bid, { enabled: false, current: null, rules: { smallSilentDays: 7, largeSilentDays: 30, expireDays: 7 } });
    }
    if (r.path.endsWith('/activity.hub')) {
      return businessEnvelope(r.bid, {
        limitedEvent: { activeCount: 0 }, guildCompetition: { phase: 'INACTIVE' },
        guildSecretRealmWar: { phase: 'INACTIVE', activeStartAt: '', activeEndAt: '', maxAttackPerWeek: 0, remainingAttackCount: 0 },
        access: { hasGuild: false, canAccessOverseasIsland: false }, newcomerVisible: true, giftCodesVisible: false
      });
    }
    const { isNewcomer: _, ...profileFacts } = profile;
    return businessEnvelope(r.bid, {
      profile: { ...profileFacts, ...(r.bid === 'newcomer' ? { isNewcomer: true } : {}) },
      notifications: [], atmosphere: { text: null, kind: 'none' }
    });
  });
  await app.invoke(app.events.groupMessage(), startFeatureVisibility);
  for (const [route, text, userId, showsNewcomer] of [
    [activity, '/我的活动', 'veteran', true],
    [handler, '/我的资料', 'newcomer', false],
    [handler, '/我的资料', 'veteran', false]
  ] as const) {
    const result = await app.runHandler(route, app.events.privateMessage({ text, userId, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    assert.equal(view.commands.includes('/回归活动'), text === '/我的活动', text);
    assert.equal(view.commands.includes('/新人狂欢'), showsNewcomer, text);
    if (text === '/我的活动') {
      assert.match(view.text, /新人狂欢[^\n]*初入仙途[^\n]*\n+[^\n]*回归活动[^\n]*查看回归资格与签到奖励/);
    }
  }

  await app.mount({ responseRouter: router });
  for (const text of ['/回归活动', '/回归奖励', '/回归签到']) {
    const result = await app.dispatch(app.events.privateMessage({ text, userId: 'veteran', platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.match(inspectMessage(message.nodes).text, /本服回归活动暂未开启/);
    assert.equal(requests.filter(r => r.path.endsWith('/native-comeback.overview')).at(-1)?.body.messageText, text);
  }
});
