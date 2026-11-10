import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { COMMAND_CATALOG } from '../../src/response-apps/more/commandCatalog';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

test('更多和指令大全沿用统一入口和常用指令，兼容旧入口并支持分类翻页', async t => {
  const { app, requests } = await gameFixture(t, request =>
    businessEnvelope(request.bid, {
      registered: true,
      moreVisibleCommands: ['/珍宝楼', '/我的回忆', '/图鉴'],
      foldVisibleCommands: []
    })
  );
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  app.actions.on('message.send', () => [createResult(ResultCode.Ok, '已送达', { id: 'catalog-receipt' })]);

  const send = async (text: string, userId?: string) => {
    const result = await app.dispatch(app.events.privateMessage({ text, platform: 'qq-bot', userId }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const markdown = message.nodes.flatMap(node => (node.type === 'Markdown' ? node.value : []));
    const nodes = markdown.flatMap(node => (node.type === 'MD.blockquote' && Array.isArray(node.value) ? node.value : [node]));
    const textNodes = nodes.flatMap(node => (node.type === 'MD.text' ? [node.value] : []));
    return {
      buttons: nodes.flatMap(node => (node.type === 'MD.button' ? [node.options?.data] : [])),
      rows: textNodes.find(value => value.startsWith('| 功能类型 | 指令 | 参数 | 作用 |'))?.split('\n').slice(2),
      text: textNodes.join('\n')
    };
  };

  const home = await send('/更多');
  assert.ok(home.buttons.includes('/指令大全'));
  assert.ok(!home.buttons.includes('/更多 指令大全'));
  assert.deepEqual(await send('/折叠 2'), home);
  const trade = await send('/更多 交易');
  assert.ok(trade.buttons.includes('/珍宝楼'));
  assert.ok(trade.buttons.includes('/更多'));
  assert.ok(!trade.buttons.includes('/登录'));
  const profile = await send('/更多 个人资料');
  assert.ok(profile.buttons.includes('/更多 设置'));
  assert.ok(profile.buttons.includes('/更多 游戏资料'));
  assert.ok(!profile.buttons.includes('/更多 个人资料'));
  const requestsAfterMore = requests.length;

  const table = await send('/指令大全');
  assert.deepEqual(await send('/更多 指令大全'), table);
  assert.deepEqual(await send('/指令大全 1'), table);
  assert.equal(table.rows?.length, 10);
  assert.ok(!table.text.includes('`/指令大全`'));
  assert.equal(table.rows?.[0], '| 入门与资料 | `/更多` | `分类（可选）` | 浏览游戏功能目录。 |');
  assert.ok(table.buttons.includes('/指令大全 2'));
  assert.ok(table.buttons.includes('/指令大全 分类'));
  assert.ok(table.buttons.includes('/更多'));

  const index = await send('/指令大全 分类');
  assert.ok(index.buttons.includes('/指令大全 入门与资料'));
  assert.ok(index.buttons.includes('/指令大全 分类 2'));
  assert.ok(index.buttons.includes('/指令大全'));

  const first = await send('/指令大全 入门与资料');
  assert.equal(first.rows?.[0], table.rows?.[0]);
  assert.ok(!first.text.includes('`/指令大全`'));
  assert.ok(!first.text.match(/折叠|扩展/));
  assert.ok(first.buttons.includes('/指令大全 入门与资料 2'));
  assert.ok(first.buttons.includes('/指令大全 分类'));

  const market = await send('/指令大全 交易与商店');
  assert.ok(market.rows?.some(row => row.includes('`/珍宝楼`')));
  assert.ok(market.rows?.some(row => row.includes('`/我的交易记录`')));
  assert.ok(!market.text.includes('/交易所'));
  const marketNext = await send('/指令大全 交易与商店 2');
  assert.ok(marketNext.rows?.some(row => row.includes('`/珍宝楼 搜索`')));
  assert.ok(marketNext.buttons.includes('/指令大全 交易与商店 1'));

  const comeback = COMMAND_CATALOG.find(([, commands]) => commands.includes('/回归奖励'));
  assert.ok(comeback?.[1].includes('/回归签到'));

  const unknown = await send('/指令大全 占位输入');
  assert.ok(unknown.text.includes('未找到该分类'));
  assert.ok(!unknown.text.includes('占位输入'));
  assert.ok(!unknown.buttons.some(button => button?.includes('占位输入')));

  const last = Math.ceil(COMMAND_CATALOG.length / 10);
  assert.deepEqual(await send('/更多 指令大全 2'), await send('/指令大全 2'));
  const final = await send(`/指令大全 ${last + 1}`);
  assert.ok(final.rows?.at(-1)?.includes('`/结束客服`'));
  assert.ok(final.buttons.includes(`/指令大全 ${last - 1}`));
  assert.ok(!final.buttons.includes(`/指令大全 ${last + 1}`));
  assert.ok(table.buttons.includes('/指令搜索'));
  const help = await send('/指令搜索');
  assert.ok(help.text.includes('/指令搜索 关键词'));

  const byDescription = await send('/指令搜索 首充档位');
  assert.deepEqual(byDescription.rows, ['| 充值与权益 | `/充值 首充礼包` | `页码（可选）` | 查看首充档位礼包。 |']);
  const combined = await send('/指令搜索 交易 信誉');
  assert.ok(combined.rows?.some(row => row.includes('`/信誉分`')));
  assert.ok(!combined.text.includes('交易 信誉'));

  const byCategory = await send('/指令搜索 交易与');
  assert.equal(byCategory.rows?.length, 10);
  assert.ok(byCategory.rows?.every(row => row.startsWith('| 交易与商店 |')));
  const nextSearchPage = byCategory.buttons.find(button => button && /^\/指令搜索翻页 [a-f0-9]{24} 2$/.test(button));
  assert.ok(nextSearchPage);
  assert.ok([...nextSearchPage].length <= 80);
  assert.ok(!byCategory.buttons.some(button => button?.includes('交易与')));
  const searchSecond = await send(nextSearchPage);
  assert.ok(searchSecond.rows?.length);
  assert.ok(searchSecond.rows?.every(row => row.startsWith('| 交易与商店 |')));
  assert.notDeepEqual(searchSecond.rows, byCategory.rows);
  assert.ok(searchSecond.buttons.includes('/指令大全'));

  const foreign = await send(nextSearchPage, 'another-player');
  assert.equal(foreign.rows, undefined);
  assert.ok(foreign.text.includes('搜索结果已失效'));

  for (const keyword of ['占位输入', '/珍宝楼', '排序（可选）']) {
    const noMatch = await send(`/指令搜索 ${keyword}`);
    assert.equal(noMatch.rows, undefined);
    assert.ok(noMatch.text.includes('没有找到匹配的指令'));
    assert.ok(!noMatch.text.includes(keyword));
    assert.ok(!noMatch.buttons.some(button => button?.includes(keyword)));
  }

  assert.equal(requests.length, requestsAfterMore);
});
