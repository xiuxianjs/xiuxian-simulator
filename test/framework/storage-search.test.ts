import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const reference = '0123456789abcdef01234567';
const keyword = '查询占位词';
const item = { id: 128, name: '精力丹', category: 'prop', subtype: 'pill', quantity: 12 };

test('储物袋菜单预填搜索，真实路由以短引用翻页并保留返回入口', async t => {
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/storage.menu')) {
      return businessEnvelope(request.bid, { message: '' });
    }
    if (request.path.endsWith('/online-encounter.check')) {
      return businessEnvelope(request.bid, { triggered: false, pending: null, nextCheckAt: '2099-01-01T00:00:00Z', nextGameDayAt: '2099-01-01T16:00:00Z', quotaExhausted: false });
    }
    assert.ok(request.path.endsWith('/storage.search'));
    const { page, keyword: query, searchReference } = request.body.arguments as { page: number; keyword?: string; searchReference?: string };

    if (query === '未命中占位词') {
      return businessEnvelope(request.bid, { items: [], page: 1, totalPages: 1, total: 0 });
    }
    if (query === '失败占位词' || (searchReference && page === 3)) {
      return businessEnvelope(request.bid, undefined, [{
        title: '',
        heading: '',
        text: query ? '失败占位词' : '搜索已失效，请重新输入关键词',
        buttons: [{ label: '失败占位词', command: '/储物袋 搜索 失败占位词' }],
        advice: []
      }]);
    }
    if (query === '无缓存占位词') {
      return businessEnvelope(request.bid, { items: [item], page: 1, totalPages: 2, total: 6 });
    }

    return businessEnvelope(request.bid, { items: [item], page, totalPages: 2, total: 6, searchReference: reference });
  });
  const routes = app.run(createGameRouter);

  await app.mount({ responseRouter: routes.router });
  const dispatch = async (text: string, groupChat = false) => {
    const result = await app.dispatch(groupChat ? app.events.groupMessage({ text, platform: 'qq-bot' }) : app.events.privateMessage({ text, platform: 'qq-bot' }));

    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1, text);
    const message = result.messages[0];

    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);

    return message.nodes;
  };
  const prefill = '/储物袋 搜索 ';
  const menu = await dispatch('/储物袋');
  const button = menu.flatMap(node => node.type === 'Markdown' ? node.value : [])
    .find(node => node.type === 'MD.button' && node.options?.data === prefill);

  assert.ok(button?.type === 'MD.button');
  assert.equal(button.options?.autoEnter, false);

  const search = inspectMessage(await dispatch(prefill + keyword, true));

  assert.deepEqual(requests.at(-1)?.body.arguments, { keyword, page: 1 });
  assert.match(search.text, /储物袋 · 搜索结果/);
  assert.match(search.text, /精力丹.*#128/);
  assert.match(search.text, /类型：道具 · 丹药/);
  assert.match(search.text, /数量：12/);
  assert.match(search.text, /第1\/2页/);
  assert.doesNotMatch(search.text, new RegExp(keyword));
  assert.ok(search.commands.every(command => !command.includes(keyword)));
  assert.ok(search.commands.includes(prefill));
  assert.ok(search.commands.includes('/储物袋'));

  const nextPage = search.commands.find(command => command === `/储物袋 搜索续 ${reference} 2`);

  assert.ok(nextPage);
  assert.ok([...nextPage].length <= 80);
  const second = inspectMessage(await dispatch(nextPage));

  assert.match(second.text, /第2\/2页/);
  assert.ok(second.commands.includes(`/储物袋 搜索续 ${reference} 1`));
  assert.deepEqual(requests.at(-1)?.body.arguments, { searchReference: reference, page: 2 });

  const none = inspectMessage(await dispatch('/储物袋搜索 未命中占位词'));

  assert.match(none.text, /储物袋中没有匹配的物品/);
  assert.doesNotMatch(none.text, /未命中占位词/);
  assert.deepEqual(requests.at(-1)?.body.arguments, { keyword: '未命中占位词', page: 1 });

  const noCache = inspectMessage(await dispatch('/背包 搜索 无缓存占位词'));

  assert.match(noCache.text, /续查暂不可用/);
  assert.ok(noCache.commands.every(command => !command.includes('无缓存占位词') && !command.includes('搜索续')));

  const expired = inspectMessage(await dispatch(`/储物袋 搜索续 ${reference} 3`));
  const failed = inspectMessage(await dispatch('/储物袋 搜索 失败占位词'));

  assert.match(expired.text, /搜索已失效/);
  assert.match(failed.text, /储物袋搜索暂不可用/);
  for (const view of [expired, failed]) {
    assert.doesNotMatch(view.text, /失败占位词/);
    assert.ok(view.commands.every(command => !command.includes('失败占位词')));
    assert.ok(view.commands.includes(prefill));
    assert.ok(view.commands.includes('/储物袋'));
  }

  const beforeInvalid = requests.length;
  const missing = inspectMessage(await dispatch('/储物袋 搜索'));
  const malformed = inspectMessage(await dispatch('/储物袋 搜索续 无效占位词 2'));

  assert.match(missing.text, /物品名称/);
  assert.match(malformed.text, /搜索已失效/);
  assert.doesNotMatch(malformed.text, /无效占位词/);
  assert.equal(requests.length, beforeInvalid);
});
