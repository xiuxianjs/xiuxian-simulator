import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import createEntry from '../../src/response/glossary/create/res';
import deleteEntry from '../../src/response/glossary/delete/res';
import query from '../../src/response/glossary/query/res';
import category from '../../src/response/glossary/category/res';
import apply from '../../src/response/glossary/apply/res';
import { businessEnvelope, gameFixture } from './fixture';

after(async () => { await shutdownLogger(); });

test('词库读取失败时只展示固定的审核不可用提示', async t => {
  const { app, requests } = await gameFixture(t, () => ({
    code: 'SERVICE_UNAVAILABLE',
    message: '词典内容审核暂不可用，请稍后再试'
  }), 503);
  const result = await app.runHandler(createEntry, app.events.groupMessage({ text: '/录入词典 回显占位词 占位正文', platform: 'qq-bot' }));
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /词典内容审核暂不可用，请稍后再试/);
  assert.doesNotMatch(view.text, /回显占位词|占位正文/);
  assert.ok(view.commands.every(command => !command.includes('回显占位词')));
  assert.equal(requests.length, 1);
});

test('词典编辑申请发送理由给服务端但回执不复述', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, { outcome: 'submitted' }));
  const result = await app.runHandler(apply, app.events.groupMessage({ text: '/申请词典编辑权限 回显占位理由', platform: 'qq-bot' }));
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /词典编辑权限申请已提交/);
  assert.doesNotMatch(view.text, /回显占位理由/);
  assert.ok(view.commands.every(command => !command.includes('回显占位理由')));
  assert.deepEqual(requests[0].body.arguments, { reason: '回显占位理由' });
});

test('词典分类无效时只显示允许的分类', async t => {
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, {
    exact: null,
    policy: { categories: ['通用', '道具'], defaultCategory: '通用', keywordMaxLength: 30, contentMaxLength: 500, categoryValid: false }
  }));
  const result = await app.runHandler(category, app.events.groupMessage({ text: '/词典分类 回显占位词', platform: 'qq-bot' }));
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /请选择下方可用分类/);
  assert.doesNotMatch(view.text, /回显占位词/);
  assert.ok(view.commands.includes('/词典分类 道具'));
  assert.ok(view.commands.every(command => !command.includes('回显占位词')));
});

test('旧词典审核回执中的违禁词和失败按钮参数不会被发给 QQ', async t => {
  const rejected = '词条名称包含违禁词：占位词';
  const { app } = await gameFixture(t, r => businessEnvelope(r.bid, undefined, [{
    title: '词典',
    heading: '',
    text: rejected,
    blocks: [{ text: rejected, quoted: false, inlineButtons: [] }],
    advice: [],
    buttons: [
      { label: '查看词条', command: '/词典 占位词' },
      { label: '返回词典', command: '/词典' },
      { label: '继续录入', command: '/录入词典' }
    ]
  }]));
  const result = await app.runHandler(createEntry, app.events.groupMessage({ text: '/录入词典 占位词 示例正文', platform: 'qq-bot' }));
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /词条内容未通过审核，请修改后重试/);
  assert.doesNotMatch(view.text, /占位词|示例正文/);
  assert.deepEqual(view.commands, ['/词典', '/录入词典', '/我', '/属性面板', '/查看主线', '/我的活动', '/商店']);
});

test('词典模糊搜索用短引用翻页且不把原词放入消息节点', async t => {
  const searchReference = '0123456789abcdef01234567';
  const { app, requests } = await gameFixture(t, r => {
    const args = r.body.arguments as { page: number };
    return businessEnvelope(r.bid, {
      exact: null,
      searchReference,
      page: { total: 6, pageSize: 5, page: args.page, items: [{ id: 1, keyword: '资料条目', content: '已有词条正文', category: '通用', authorName: '作者', editCount: 0, lastEditorName: '' }] }
    });
  });
  const render = async (text: string) => {
    const result = await app.runHandler(query, app.events.groupMessage({ text, platform: 'qq-bot' }));
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    return inspectMessage(message.nodes);
  };
  const first = await render('/词典 搜索占位词');
  assert.doesNotMatch(first.text, /搜索占位词/);
  assert.ok(first.commands.every(command => !command.includes('搜索占位词')));
  const next = first.commands.find(command => command === `/词典 续查 ${searchReference} p2`);
  assert.ok(next);
  await render(next);
  assert.deepEqual(requests.map(request => request.body.arguments), [
    { keyword: '搜索占位词', category: '', page: 1 },
    { keyword: '', category: '', page: 2, searchReference }
  ]);
});

for (const outcome of ['created', 'updated', 'deleted'] as const) {
  test(`词典写入成功回执不回显词条名（${outcome}）`, async t => {
    const deleted = outcome === 'deleted';
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, deleted
      ? { outcome, stateChanged: true, logWritten: true, entryId: 41 }
      : { mode: 'write', result: { outcome, category: '通用', reason: '', matchedWords: [], entryId: 41,
        isNew: outcome === 'created', dailyLimit: 10, used: 2, completedStage: 'contribution', failedStage: null, commitUnknown: false } }));
    const result = await app.runHandler(deleted ? deleteEntry : createEntry, app.events.groupMessage({
      text: deleted ? '/删除词典 旧词条占位词' : '/录入词典 旧词条占位词 正文占位词', platform: 'qq-bot'
    }));
    const sent = result.messages[0];
    assert.equal(result.actions[sent.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(sent.nodes);
    assert.match(view.text, { created: /词条创建成功/, updated: /词条更新成功/, deleted: /词条已删除/ }[outcome]);
    assert.doesNotMatch(view.text, /占位词/);
    assert.ok(view.commands.every(command => !command.includes('占位词')));
    assert.ok(view.commands.includes('/词典'));
    assert.equal((requests[0].body.arguments as { keyword: string }).keyword, '旧词条占位词');
  });
}
