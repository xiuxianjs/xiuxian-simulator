import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { after, before, mock, test } from 'node:test';
import { Format, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { businessEnvelope, gameFixture } from './fixture';
import tianshu from '../../src/response/tianshu/res';


import { startFeatureVisibility } from '../../src/utils/featureVisibility';
import { useMessage } from '../../src/utils/useMessage';
import type { TianshuContent } from '../../src/api/bot/tianshu-content';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const output = goTestFixture(['test', './internal/service', '-run', '^TestTianshuPresentationCommandBoundaryFixture$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server', import.meta.url)), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024
});
const rows = [...output.matchAll(/TIANSHU_PRESENTATION_BOUNDARY=(.+)/g)].map(match => JSON.parse(match[1]) as { level: number; content: TianshuContent; allowed: string[] });
assert.equal(rows.length, 11);
for (const row of rows) {
  test(`真实Go规则逐指令验证发送过滤 level=${row.level}`, async t => {
    const { app, requests } = await gameFixture(t, request => request.bid ? row.content : rows[0].content);
    const result = await app.invoke(app.events.privateMessage({ userId: 'presentation', platform: 'qq-bot' }), async () => {
      await startFeatureVisibility();
      const md = Format.createMarkdown().addText('功能入口');
      for (const alias of Object.keys(row.content.commandFeatures!)) md.addButton(alias, { data: '/' + alias });
      await useMessage()[0].send({ format: Format.create().addMarkdown(md) });
    });
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    assert.deepEqual(inspectMessage(result.messages[0].nodes).commands.sort(), row.allowed);
    assert.equal(requests.length, 2, 'one startup read plus one current-player read');
  });
}

test('真实Go天书完整分页包含所有在运营功能、准确开放状态与实际玩法条件', async t => {
  const row = rows.find(item => item.level === 2)!;
  const content = row.content;
  const stages = content.featureCatalog!.filter(group => group.stageLevel > 0).sort((a, b) => a.stageLevel - b.stageLevel);
  const { app } = await gameFixture(t, request => request.path.includes('/business/') ? businessEnvelope(request.bid, content) : content);
  await app.invoke(app.events.privateMessage(), startFeatureVisibility);
  const pages = stages.length;
  let combined = '';
  for (let page = 1; page <= pages; page++) {
    const result = await app.runHandler(tianshu, app.events.privateMessage({ userId: 'presentation', platform: 'qq-bot', text: `/天书 ${page}` }));
    assert.equal(result.messages.length, 1);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(result.messages[0].nodes);
    assert.match(view.text, new RegExp(`第${page}/${pages}页`));
    assert.ok(view.text.includes(stages[page - 1].stageName));
    for (const feature of stages[page - 1].features.filter(feature => !feature.name.includes('海外仙岛'))) {
      assert.ok(view.text.includes(`${feature.name} · ${feature.realmReached ? '已开放' : '待开放'} · ${feature.realm}`), feature.id);
    }
    if (page > 1) assert.ok(view.commands.includes(`/天书 ${page - 1}`));
    if (page < pages) assert.ok(view.commands.includes(`/天书 ${page + 1}`));
    combined += view.text;
  }
  assert.ok(combined.includes('好友 · 已开放 · 炼气二层'));
  assert.ok(combined.includes('炼丹师 · 待开放 · 炼气九层'));
  assert.ok(!combined.includes('开放状态仅表示'));
  const common = await app.runHandler(tianshu, app.events.privateMessage({ userId: 'presentation', platform: 'qq-bot', text: '/天书 通用' }));
  assert.equal(common.messages.length, 1);
  assert.equal(common.actions[common.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const commonText = inspectMessage(common.messages[0].nodes).text;
  for (const feature of content.featureCatalog!.find(group => group.stageLevel === 0)!.features) assert.ok(commonText.includes(feature.name));
  assert.ok(!combined.includes('海外仙岛'));
});



