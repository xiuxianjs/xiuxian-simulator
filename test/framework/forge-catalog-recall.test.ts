import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import gift from '../../src/response/companion/gift/res';
import forge from '../../src/response/profession/forge/res';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

test('旧赠送类别直接提示禁赠', async t => {
  const { app, requests } = await gameFixture(t, () => {
    throw new Error('禁赠类别不应发出请求');
  });

  for (const text of ['/赠送 丹方 旧丹方 2', '/赠送 图纸 铁盔锻造图纸 2', '/赠送 锻造图纸']) {
    const result = await app.runHandler(gift, app.events.privateMessage({ text, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.match(inspectMessage(message.nodes).text, /丹方和锻造图纸不可赠送/);
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  }

  assert.equal(requests.length, 0);
});

test('锻造图鉴显示自动解锁规则并移除手动学习按钮', async t => {
  const { overview } = JSON.parse(readFileSync(new URL('../fixtures/forge-contracts.json', import.meta.url), 'utf8'));
  overview.recipes[0].learned = false;
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, overview));
  const result = await app.runHandler(forge, app.events.privateMessage({ text: '/锻造图纸', platform: 'qq-bot' }));

  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  const view = inspectMessage(message.nodes);
  assert.match(view.text, /达到对应锻造等级后自动解锁图纸/);
  assert.ok(!view.commands.includes('/学习锻造图纸'));
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});

test('图谱可筛选并学习储物袋内符合条件的指定图纸', async t => {
  const { overview } = JSON.parse(readFileSync(new URL('../fixtures/forge-contracts.json', import.meta.url), 'utf8'));
  const recipe = overview.recipes[0];
  const storageId = 8001;

  recipe.learned = false;
  recipe.canCraft = false;
  recipe.reason = '职业等级不足';
  const learnableBlueprints = [{ storageId, recipeId: recipe.id, name: '测试锻造图纸' }];
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/forge.learn')) {
      return businessEnvelope(request.bid, { ...learnableBlueprints[0], recipeName: recipe.name });
    }

    return businessEnvelope(request.bid, { ...overview, learnableBlueprints });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });

  for (const text of ['/锻造图纸', '/锻造图纸 可学习', `/锻造图纸详情 ${recipe.id} 可学习 1`]) {
    const result = await app.dispatch(app.events.privateMessage({ text, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);

    assert.match(view.text, /储物袋：测试锻造图纸/);
    assert.ok(view.commands.includes(`/学习锻造图纸 ${storageId}`));
    assert.ok(!view.commands.includes(`/打造 ${recipe.id}`));
    if (text === '/锻造图纸') {
      assert.ok(view.commands.includes('/锻造图纸 可学习'));
    }
  }

  const result = await app.dispatch(app.events.privateMessage({ text: `/学习锻造图纸 ${storageId}`, platform: 'qq-bot' }));
  const learnRequests = requests.filter(request => request.path.endsWith('/forge.learn'));

  assert.equal(learnRequests.length, 1);
  assert.deepEqual(learnRequests[0].body.arguments, { storageId });
  const view = inspectMessage(result.messages[0].nodes);

  assert.ok(view.text.includes(`已掌握【${recipe.name}】锻造图纸`));
  assert.ok(view.commands.includes('/锻造图纸'));
});
