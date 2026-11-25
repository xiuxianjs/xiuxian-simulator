import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { logger, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';
import menu from '../../src/response/leaderboard/res';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

for (const [title, operation, home, score] of [
  ['锻造师榜', 'leaderboard.forge', '/我的锻造', '锻造 5 级'],
  ['宝录收藏榜', 'leaderboard.baolu', '/天师宝录', '已解锁 20 项'],
  ['灵植师榜', 'leaderboard.herbalist', '/灵药师', '灵植 5 级'],
  ['同届新秀榜', 'leaderboard.newcomers', '/查看主线', '20 星'],
  ['灵脉宗门榜', 'leaderboard.spirit-war', '/灵脉攻防战列表 1', '20 分'],
  ['宗门主线榜', 'leaderboard.guild-story', '/宗门主线', '75%'],
  ['竞技周榜', 'leaderboard.spar', '/登天梯', '独立胜场 20'],
  ['珍宝楼商誉榜', 'leaderboard.merchants', '/珍宝楼', '20 位独立买家']
]) {
  test(`${title} renders bounded pagination and a personal rank outside the top 50`, async t => {
    const logged = t.mock.method(logger, "error", () => {});
    const { app, requests } = await gameFixture(t, request =>
      businessEnvelope(request.bid, {
        page: 5,
        totalPages: 5,
        total: 50,
        ...(operation === 'leaderboard.spirit-war' ? { scope: '战场 2', battlefield: 2 } : {}),
        items: [{ rank: 41, playerId: 101, name: '青崖', level: 5, exp: 820, unlocked: 20, score: 20, progress: 7500 }],
        self: { rank: 66, playerId: 1, name: '本人', level: 3, exp: 240, unlocked: 8 }
      })
    );
    const router = app.run(createGameRouter);
    await app.mount({ responseRouter: router.router });
    const result = await app.dispatch(app.events.groupMessage({ text: `/${title} 99999${operation === 'leaderboard.spirit-war' ? ' 2' : ''}`, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(requests.length, 1, String(logged.mock.calls[0]?.arguments[1]));
    assert.ok(requests[0].path.endsWith('/' + operation));
    assert.deepEqual(requests[0].body.arguments, operation === 'leaderboard.spirit-war' ? { page: 5, battlefield: 2 } : { page: 5 });
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    for (const fact of [title, '青崖', '#41', '第 66 名', score]) assert.ok(view.text.includes(fact), view.text);
    for (const command of [home, '/排行榜', `/${title} 4${operation === 'leaderboard.spirit-war' ? ' 2' : ''}`]) assert.ok(view.commands.includes(command), view.commands.join(','));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}

test('leaderboard menu exposes the current fishing, world boss and collection buttons', async t => {
  const commands = ['/垂钓 积分榜', '/凶兽排行', '/锻造师榜', '/宝录收藏榜'];
  const { app } = await gameFixture(t, request =>
    businessEnvelope(request.bid, commands.map((command, index) => ({
      ...(index === 0 ? { menuHint: '榜单说明' } : {}),
      menu: { group: index < 2 ? '竞技与活动' : '修仙百业', label: command.slice(1), command, description: '查看榜单' }
    })))
  );
  const result = await app.runHandler(menu, app.events.privateMessage({ text: '/排行榜', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const view = inspectMessage(result.messages[0].nodes);
  for (const command of commands) assert.ok(view.commands.includes(command), view.commands.join(','));
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});

test('paginated catalog exposes all twenty-two buttons through the real router', async t => {
  const names = Array.from({ length: 22 }, (_, i) => `/测试榜${i + 1}`);
  const { app, requests } = await gameFixture(t, request =>
    businessEnvelope(request.bid, names.map((command, i) => ({
      ...(i === 0 ? { menuHint: '榜单说明' } : {}),
      menu: { group: i < 11 ? '实力成长' : '竞技与活动', label: command.slice(1), command, description: '查看榜单' }
    })))
  );
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  for (const page of [1, 2]) {
    const sent = await app.dispatch(app.events.privateMessage({ text: `/排行榜 ${page}`, platform: 'qq-bot' }));
    assert.deepEqual(sent.errors, []);
    const view = inspectMessage(sent.messages[0].nodes);
    assert.deepEqual(view.commands.filter(command => command.startsWith('/测试榜')), names.slice((page - 1) * 11, page * 11));
    assert.ok(view.commands.includes(`/排行榜 ${3 - page}`));
  }
  assert.equal(requests.length, 2);
});

for (const [currency, operation] of [
  ['灵石', 'leaderboard.spirit-stone'],
  ['灵晶', 'leaderboard.spirit-crystal']
]) {
  test(`${currency}榜 preserves large balances and renders redacted entries`, async t => {
    const base = { level: 0, exp: 0, unlocked: 0, score: 0, progress: 0 };
    const hidden = { ...base, rank: 1, playerId: 0, name: '匿名道友', hidden: true };
    const { app, requests } = await gameFixture(t, request =>
      businessEnvelope(request.bid, {
        page: 1,
        totalPages: 1,
        total: 2,
        items: [hidden, { ...base, rank: 2, playerId: 4, name: '青崖', balance: '9007199254740993' }],
        self: hidden
      })
    );
    await app.mount({ responseRouter: app.run(createGameRouter).router });
    const result = await app.dispatch(app.events.groupMessage({ text: `/${currency}榜`, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + operation));
    const view = inspectMessage(result.messages[0].nodes);
    assert.ok(view.text.includes(`9,007,199,254,740,993 ${currency}`), view.text);
    assert.ok(view.text.includes('匿名道友'));
    assert.equal(view.text.split('余额已隐藏').length - 1, 2);
    assert.deepEqual(view.commands.filter(command => command === '/排行榜'), ['/排行榜']);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
