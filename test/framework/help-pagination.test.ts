import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

for (const registered of [false, true]) {
  test(`帮助目录和翻页按钮能往返 registered=${registered}`, async t => {
    const { app, requests } = await gameFixture(t, request => {
      const response = businessEnvelope(request.bid, {
        registered,
        moreVisibleCommands: registered ? ['/查看主线'] : [],
        foldVisibleCommands: [],
        ...(registered && (request.body.arguments as { topic?: string }).topic ? {
          progress: {
            realm: '元婴初期',
            features: ['profile', 'storyline', 'herbalist', 'soul-path', 'checkin'],
            growth: { kind: '突破', experience: 8200, required: 10000, target: '元婴中期', ready: false, reason: '', materials: [] },
            story: { chapter: 3, cleared: 2, total: 5, chests: 0, nextStage: 3, ready: true },
            farm: { planted: 2, mature: 1, abnormal: 0 },
            signed: true
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
    const start = overview.commands.find(command => command === '/帮助 1');
    assert.ok(start, JSON.stringify(overview));
    if (registered) {
      assert.match(overview.text, /元婴初期/);
      assert.match(overview.text, /主线.*第 3 章/);
      assert.match(overview.text, /灵田.*成熟 1 块/);
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

    const first = await open(start);
    assert.match(first.text, /第1\/3页.*下一页/);
    assert.doesNotMatch(first.text, /上一页/);
    const next = first.commands.find(command => command === '/帮助 2');
    assert.ok(next);

    const second = await open(next);
    assert.match(second.text, /第2\/3页.*上一页.*下一页/);
    const last = second.commands.find(command => command === '/帮助 3');
    assert.ok(last);

    const third = await open(last);
    assert.match(third.text, /第3\/3页.*上一页/);
    assert.doesNotMatch(third.text, /下一页/);
    const previous = third.commands.find(command => command === '/帮助 2');
    assert.ok(previous);
    assert.match((await open(previous)).text, /第2\/3页/);
    const back = third.commands.find(command => command === '/帮助');
    assert.ok(back);

    assert.match((await open(back)).text, /修仙帮助/);
    assert.match((await open('/帮助 0')).text, /第1\/3页/);
    assert.match((await open('/帮助 99')).text, /第3\/3页/);
    const invalid = await open('/帮助 输入42');
    assert.doesNotMatch(invalid.text, /输入42|第3\/3页/);
    assert.equal(requests.length, registered ? 12 : 9);
    assert.deepEqual(requests[0].body.arguments, { topic: 'overview' });
    if (registered) assert.deepEqual(requests.slice(1, 4).map(request => request.body.arguments), [
      { topic: 'realm' }, { topic: 'soul' }, { topic: 'farm' }
    ]);
    assert.ok(requests.every(request => request.path.endsWith('/navigation.help')));
  });
}
