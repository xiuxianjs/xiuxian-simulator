import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createResult, ResultCode, shutdownLogger } from 'alemonjs';
import { COMMAND_CATALOG } from '../../src/response-apps/more/commandCatalog';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

test('更多指令大全从指令数据生成表格，翻页与返回按钮可用', async t => {
  const { app, requests } = await gameFixture(t, request =>
    businessEnvelope(request.bid, { registered: false, moreVisibleCommands: [], foldVisibleCommands: [] })
  );
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  app.actions.on('message.send', () => [createResult(ResultCode.Ok, '已送达', { id: 'catalog-receipt' })]);

  const send = async (text: string) => {
    const result = await app.dispatch(app.events.privateMessage({ text, platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const nodes = message.nodes.flatMap(node => (node.type === 'Markdown' ? node.value : []));
    const buttons = nodes.flatMap(node =>
      node.type === 'MD.button'
        ? [node.options?.data]
        : node.type === 'MD.blockquote' && Array.isArray(node.value)
          ? node.value.flatMap(item => (item.type === 'MD.button' ? [item.options?.data] : []))
          : []
    );
    const table = nodes.flatMap(node => (node.type === 'MD.text' && node.value.startsWith('| 功能类型') ? [node.value] : []));
    return { buttons, rows: table[0]?.split('\n').slice(2) };
  };

  const home = await send('/更多');
  assert.ok(home.buttons.includes('/更多 指令大全'));
  const requestsAfterHome = requests.length;
  const last = Math.ceil(COMMAND_CATALOG.length / 10);

  const first = await send('/更多 指令大全');
  assert.equal(first.rows?.length, 10);
  assert.equal(first.rows?.[0], '| 入门与资料 | `/更多`、`/折叠`、`/扩展` | `分类（可选）` | 浏览游戏功能目录。 |');
  assert.ok(first.buttons.includes('/更多 指令大全 2'));
  assert.ok(first.buttons.includes('/更多'));

  const second = await send('/更多 指令大全 2');
  assert.equal(second.rows?.length, 10);
  assert.equal(second.rows?.[0], '| 入门与资料 | `/继续`、`/跳过剧情`、`/跳过引导`、`/跳过` | — | 推进当前引导，或跳过剧情及引导。 |');
  assert.ok(second.buttons.includes('/更多 指令大全 1'));
  assert.ok(second.buttons.includes('/更多 指令大全 3'));

  const final = await send(`/更多 指令大全 ${last + 1}`);
  assert.equal(final.rows?.length, COMMAND_CATALOG.length - (last - 1) * 10);
  assert.equal(final.rows?.at(-1), '| 客服与反馈 | `/结束客服` | `会话编号（可选）` | 关闭客服会话。 |');
  assert.ok(final.buttons.includes(`/更多 指令大全 ${last - 1}`));
  assert.ok(!final.buttons.includes(`/更多 指令大全 ${last + 1}`));
  assert.equal(requests.length, requestsAfterHome);
});
