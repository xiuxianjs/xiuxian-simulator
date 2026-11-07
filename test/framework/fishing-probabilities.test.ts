import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { parseFishingView } from '../../src/api/bot/fishing';
import handler from '../../src/response/fishing/res';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

const section = (lines: string[], actions: { label: string; command: string }[] = []) => ({ lines, actions });
const common = { rulesVersion: 'probabilities-fixture', footer: [{ label: '返回垂钓', command: '/垂钓' }] };
const overview = {
  ...common, view: 'overview', title: '洞府垂钓', sections: [
    section(['水域：金丹水域']),
    section(['流云逐浪竿 · 三阶', '鱼饵：聚灵饵', '窝料：升灵散', '收益周期：7分12秒'], [
      { label: '更换钓具', command: '/垂钓 钓具 1' }, { label: '更换饵料', command: '/垂钓 饵料' },
      { label: '打窝', command: '/垂钓 打窝' }, { label: '当前概率', command: '/垂钓 当前概率' }
    ]),
    section(['本次渔获：0尾']), section(['🎣持续垂钓中🎣'])
  ]
};
const probabilities = {
  ...common, view: 'probabilities', title: '垂钓 · 当前概率', sections: [
    section(['水域：金丹水域', '钓具：流云逐浪竿 · 三阶', '鱼饵：聚灵饵', '窝料：升灵散']),
    section(['渔获：90.00%', '杂获：10.00%']),
    section(['说明：以下为抽中鱼类后的占比', '普通：90.00%', '珍惜：7.00%', '鱼王：3.00%'])
  ]
};

const flatten = (nodes: readonly any[]): any[] => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);

for (const isPrivate of [false, true]) {
  test(`当前概率从收益周期同行蓝链进入，只查询且保留服务端比例 private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid,
      (request.body.arguments as { view: string }).view === 'probabilities' ? probabilities : overview));
    const event = (text: string) => isPrivate
      ? app.events.privateMessage({ text, platform: 'qq-bot' })
      : app.events.groupMessage({ text, platform: 'qq-bot' });
    const home = await app.runHandler(handler, event('/垂钓'));
    assert.deepEqual(home.errors, []);
    assert.equal(home.messages.length, 1);
    const homeView = inspectMessage(home.messages[0].nodes);
    assert.match(homeView.text, /收益周期：7分12秒[^\S\n]*‹当前概率›/);
    const button = flatten(home.messages[0].nodes).find(node => node.type === 'MD.button' && node.options.data === '/垂钓 当前概率');
    assert.ok(button);
    assert.equal(button.options.autoEnter, false);
    assert.equal(button.options.show, undefined);
    const opened = await app.runHandler(handler, event(button.options.data));
    assert.deepEqual(opened.errors, []);
    assert.equal(opened.messages.length, 1);
    assert.deepEqual(requests.map(request => request.body.arguments), [{ view: 'overview' }, { view: 'probabilities' }]);
    assert.ok(requests.every(request => request.path.endsWith('/fishing.query')));
    const page = inspectMessage(opened.messages[0].nodes);
    for (const item of probabilities.sections.flatMap(item => item.lines)) assert.ok(page.text.includes(item));
    assert.ok(page.commands.includes('/垂钓'));
    assert.ok(!/上古|龙鲤|奇遇/.test(page.text));
    for (const result of [home, opened]) {
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      for (const node of flatten(result.messages[0].nodes).filter(node => node.type === 'MD.button')) {
        assert.equal(node.options.autoEnter, false);
        assert.equal(node.options.show, undefined);
      }
    }
  });
}

test('四个同行动作只放行垂钓主页钓具段，不放宽其他响应的按钮预算', () => {
  assert.equal(parseFishingView(overview).sections[1].actions.length, 4);
  assert.throws(() => parseFishingView({ ...overview, view: 'chum' }));
  const tooMany = structuredClone(overview);
  tooMany.sections[1].actions.push({ label: '额外', command: '/垂钓' });
  assert.throws(() => parseFishingView(tooMany));
});

test('当前概率不接受伪造鱼塘或窝饵参数', async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('must not query'); });
  for (const text of ['/垂钓 当前概率 3', '/垂钓 当前概率 升灵散']) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text, platform: 'qq-bot' }));
    assert.match(inspectMessage(result.messages[0].nodes).text, /参数错误/);
  }
  assert.equal(requests.length, 0);
});
