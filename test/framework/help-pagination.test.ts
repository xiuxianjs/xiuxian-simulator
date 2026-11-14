import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

for (const registered of [false, true]) {
  test(`个人帮助追问及旧数字入口 registered=${registered}`, async t => {
    const { app, requests } = await gameFixture(t, request => {
      const response = businessEnvelope(request.bid, {
        registered,
        moreVisibleCommands: registered ? ['/查看主线'] : [],
        foldVisibleCommands: [],
        ...(registered && (request.body.arguments as { topic?: string }).topic ? {
          progress: {
            realm: '元婴初期',
            features: ['profile', 'storyline', 'herbalist', 'soul-path', 'checkin', 'tongtian-tower', 'meridians'],
            growth: { kind: '突破', experience: 8200, required: 10000, target: '元婴中期', ready: false, reason: '', materials: [] },
            story: { chapter: 3, cleared: 2, total: 5, chests: 0, nextStage: 3, ready: true },
            farm: { planted: 2, mature: 1, abnormal: 0 },
            signed: true,
            ...((request.body.arguments as { topic?: string }).topic === 'tongtian' ? { details: ['通天塔每月 2-28 日开放，当前处于关闭阶段'] } : {}),
            ...((request.body.arguments as { topic?: string }).topic === 'meridian' ? { details: ['今日剩余 2 次 · 当前真气 8', '任脉 · 本次需要 10 真气', '真气不足'] } : {})
          }
        } : {})
      });
      return registered ? response : {
        ...response,
        middleware: {
          outcome: 'allow',
          reason: 'UNREGISTERED',
          identity: { bid: request.bid, account: { status: 'unregistered', playerId: null } },
          replies: [],
          contextWarnings: []
        }
      };
    });
    await app.mount({ responseRouter: app.run(createGameRouter).router });

    async function open(text: string) {
      const event = registered
        ? app.events.groupMessage({ text, platform: 'qq-bot' })
        : app.events.privateMessage({ text, platform: 'qq-bot' });
      const result = await app.dispatch(event);
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1, text);
      const [message] = result.messages;
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      return inspectMessage(message.nodes);
    }

    const overview = await open('/修仙帮助');
    assert.ok(!overview.commands.includes('/帮助 1'));
    if (registered) {
      assert.match(overview.text, /元婴初期/);
      assert.match(overview.text, /主线.*第 3 章/);
      assert.match(overview.text, /灵田.*1 块已成熟/);
      assert.ok(overview.commands.includes('/帮助 元婴初期'));
      assert.ok(overview.commands.includes('/查看主线 3'));
      const question = overview.commands.find(command => command === '/帮助 我离突破还有多远');
      assert.ok(question);
      const detail = await open(question);
      assert.match(detail.text, /还差 1,800/);
      assert.ok(detail.commands.includes('/帮助'));
      assert.match((await open('/帮助 道途突破缺什么')).text, /神魂和道途怎么提升/);
      assert.match((await open('/帮助 灵田该收还是该种')).text, /已成熟 1 块/);
    } else {
      assert.ok(overview.commands.includes('/踏入仙途'));
    }

    for (const page of [1, 2, 3]) {
      const legacy = await open(`/帮助 ${page}`);
      assert.equal(legacy.text, overview.text);
      assert.deepEqual(legacy.commands, overview.commands);
      assert.deepEqual(requests.at(-1)?.body.arguments, { topic: 'overview' });
    }

    const projected = await open('/帮助 炼气七层');
    assert.match(projected.text, /修仙帮助 · 炼气七层/);
    assert.match(projected.text, /先完成灵药师引导.*空地选种播种/);
    assert.ok(projected.commands.includes('/我的灵田'));
    assert.doesNotMatch(projected.text, /8,200|元婴初期/);
    if (registered) {
      const ownStage = await open('/帮助 元婴');
      assert.match(ownStage.text, /先看温养与补给条件/);
      assert.match(ownStage.text, /当前下一步.*主线 3-3/s);
      assert.ok(ownStage.commands.includes('/查看主线 3'));
      assert.ok(ownStage.commands.includes('/帮助'));
      const tower = await open('/帮助 通天塔和声望怎么用');
      assert.match(tower.text, /当前处于关闭阶段/);
      assert.ok(tower.commands.includes('/商店 声望'));
      const meridian = await open('/帮助 今天还能冲几次脉');
      assert.match(meridian.text, /今日剩余 2 次.*当前真气 8[\s\S]*本次需要 10 真气[\s\S]*真气不足/);
      assert.ok(meridian.commands.includes('/经络'));
    }

    const invalid = await open('/帮助 输入42');
    assert.doesNotMatch(invalid.text, /输入42|第3\/3页/);
    assert.equal(requests.length, registered ? 12 : 6);
    assert.deepEqual(requests[0].body.arguments, { topic: 'overview' });
    if (registered) assert.deepEqual(requests.slice(1, 4).map(request => request.body.arguments), [
      { topic: 'realm' }, { topic: 'soul' }, { topic: 'farm' }
    ]);
    assert.ok(requests.every(request => request.path.endsWith('/navigation.help')));
  });
}
