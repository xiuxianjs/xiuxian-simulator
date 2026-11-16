import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import info from '../../src/response/caveFormation/info/res';
import activate from '../../src/response/caveFormation/activate/res';
import remove from '../../src/response/caveFormation/remove/res';
import { createGameRouter } from '../../src/router';
import { businessEnvelope, gameFixture } from './fixture';
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [{ handler: info, op: 'cave-formations.list', text: '/洞府阵法', args: {} }, { handler: activate, op: 'cave-formations.activate', text: '/激活阵盘 隐息阵盘', args: { keyword: '隐息阵盘' } }, { handler: remove, op: 'cave-formations.remove', text: '/移除阵法 停时阵', args: { keyword: '停时阵' } }];
const noWrite = (commands: string[]) => assert.ok(!commands.some(command => /^\/(激活阵盘|移除阵法)(?:\s|$)/.test(command)));
for (const entry of entries) for (const isPrivate of [false, true]) for (const wire of ['http', 'feedback', 'structured', 'malformed', 'internal']) test(`formation ${entry.op} ${wire} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => wire === 'http' ? { code: 'CONFLICT', message: '原阵法拒绝' } : wire === 'internal' ? { code: 'INTERNAL', message: 'private formation SQL' } : businessEnvelope(request.bid, wire === 'malformed' ? {} : undefined, wire === 'malformed' ? [] : [{ title: '原标题', heading: '原抬头', text: '原阵法拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true, inlineButtons: [{ label: '原内联', command: '/灵田' }] }], buttons: [{ label: '原返回', command: '/洞府阵法' }], advice: wire === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]), wire === 'http' ? 409 : wire === 'internal' ? 500 : 200);
 const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + entry.op)); assert.deepEqual(requests[0].body.arguments, entry.args); assert.ok(requests[0].idempotencyKey); assert.equal(result.messages.length, 1); assert.ok(view.text.includes(wire === 'malformed' || wire === 'internal' ? entry.handler === info ? '获取洞府阵法失败' : '未获完整确认' : '原阵法拒绝')); assert.ok(!view.text.includes('private formation'));
 if (wire === 'feedback' || wire === 'structured') { for (const text of ['原标题', '原抬头', '原引用', '原说明']) assert.ok(view.text.includes(text)); for (const command of ['/灵田', '/洞府阵法']) assert.ok(view.commands.includes(command)); }
 if (wire === 'structured') assert.ok(view.text.includes('原服务建议')); else assert.ok(view.commands.includes('/储物袋 道具 其它 洞府阵法')); noWrite(view.commands); assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const [handler, op, text, reason, expectedCommand, expectedText] of [
 [activate, 'cave-formations.activate', '/激活阵盘', '用法：/激活阵盘 阵盘名称\n示例：/激活阵盘 隐息阵盘', '/储物袋 道具 其它 洞府阵法', '不代选默认阵盘'],
 [activate, 'cave-formations.activate', '/激活阵盘 隐息阵盘', '你当前没有【隐息阵盘】，可前往 /商店 万宝楼 购买。', '/商店 万宝楼', '持续时间不与旧阵叠加'],
 [activate, 'cave-formations.activate', '/激活阵盘 灵肥', '【灵肥】不是可激活的阵盘。', '/储物袋 道具 其它 洞府阵法', '阵盘完整名称或模板编号'],
 [remove, 'cave-formations.remove', '/移除阵法', '用法：/移除阵法 阵法名称\n示例：/移除阵法 冻结阵盘', '/洞府阵法', '移除不会返还已用阵盘'],
 [remove, 'cave-formations.remove', '/移除阵法 冻结', '当前没有生效中的【冻结阵】可移除', '/洞府阵法', '已失效或已移除时无需重复移除']
] as const) test(`formation recovery ${reason} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: [], advice: [] }])); const result = await app.runHandler(handler, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.ok(requests[0].path.endsWith('/' + op)); assert.ok(view.text.includes(reason.includes('不是可激活的阵盘') ? '该物品不是可激活的阵盘。' : reason)); assert.doesNotMatch(view.text, /【灵肥】/); assert.ok(view.text.includes(expectedText), view.text); assert.ok(view.commands.includes(expectedCommand)); noWrite(view.commands); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
const formation = { formationKey: 'yinxi', formationCategory: 'concealment', formationName: '隐息阵', formationEffect: '原实际效果', expiresAt: '2026-12-01T12:00:00Z' };

test('洞府阵法按层展示，替换和我的阵法同去可用阵法', async t => {
  const bag = '/储物袋 道具 其它 洞府阵法';
  const { app, requests } = await gameFixture(t, request => {
    if (request.path.endsWith('/cave-formations.list')) {
      return businessEnvelope(request.bid, [{ ...formation, categoryLabel: '隐匿阵', remainingText: '1小时59分' }]);
    }
    assert.ok(request.path.endsWith('/storage.props'));
    const { args } = request.body.arguments as { args: string[] };
    assert.deepEqual(args.slice(0, 2), ['其它', '洞府阵法']);
    const page = Number(args[2] ?? 1);
    const item = {
      id: 31 + page,
      userItemId: 31 + page,
      itemId: 8000 + page,
      name: page === 1 ? '隐息阵盘' : '聚灵阵盘',
      type: 'prop',
      subtype: 'other',
      quantity: 1,
      listedQuantity: 2,
      isLocked: 0,
      stackMax: 99,
      permission: 4,
      isStackable: true,
      grade: null,
      realm: null,
      effect: null,
      capabilities: [{ kind: 'activateFormation' }, { kind: 'viewDetail' }]
    };
    return businessEnvelope(request.bid, {
      items: [item],
      activeSubcategory: 'formation',
      pagination: { page, pageSize: 5, total: 6, totalPages: 2 },
      playerStageLevel: 0,
      capabilities: [{ kind: 'viewProfile' }]
    });
  });
  await app.mount({ responseRouter: app.run(createGameRouter).router });
  const send = async (text: string) => {
    const result = await app.dispatch(app.events.privateMessage({ text, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    return message;
  };
  const home = await send('/洞府阵法');
  assert.match(home.text, /我的洞府 · 阵法/);
  assert.match(home.text, /【隐匿阵】隐息阵 ‹替换›\s*‹移除›\n> 剩余 1小时59分\n> 原实际效果/);
  assert.match(home.text, /‹返回洞府›\s*‹我的阵法›/);
  const links = home.nodes
    .flatMap(node => (node.type === 'Markdown' ? node.value : []))
    .flatMap(node => (node.type === 'MD.blockquote' && Array.isArray(node.value) ? node.value : [node]))
    .filter(node => node.type === 'MD.button');
  assert.deepEqual(links.map(link => [link.value, link.options?.data]), [
    ['‹替换›', bag],
    ['‹移除›', '/移除阵法 隐息阵'],
    ['‹返回洞府›', '/我的洞府'],
    ['‹我的阵法›', bag]
  ]);
  assert.ok(links.every(link => link.options?.autoEnter === false && !Object.hasOwn(link.options ?? {}, 'show')));
  assert.ok(home.commands.includes(bag));
  assert.ok(!home.commands.includes('/储物袋 道具 其它'));
  const first = await send(bag);
  assert.match(first.text, /储物袋 · 可用阵法/);
  assert.match(first.text, /隐息阵盘/);
  assert.match(first.text, /数量：×1 · 品级：未知 · 境界：未知/);
  assert.match(first.text, /‹返回阵法›\s*‹灵田›/);
  assert.ok(first.commands.includes('/激活阵盘 8001'));
  assert.ok(first.commands.includes(`${bag} 2`));
  assert.ok(first.commands.includes('/洞府阵法'));
  assert.ok(first.commands.includes('/灵田'));
  assert.doesNotMatch(first.text, /‹我的主页›/);
  for (const command of ['/储物袋 道具 丹药', '/储物袋 道具 其它']) assert.ok(!first.commands.includes(command), command);
  for (const command of ['/我', '/属性面板', '/查看主线', '/我的活动', '/商店']) assert.ok(first.commands.includes(command), command);
  const second = await send(`${bag} 2`);
  assert.match(second.text, /聚灵阵盘/);
  assert.ok(second.commands.includes('/激活阵盘 8002'));
  assert.ok(second.commands.includes(`${bag} 1`));
  const nodes = second.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
  const row = nodes.find(node => node.type === 'MD.blockquote');
  assert.ok(row && Array.isArray(row.value));
  assert.ok(row.value.some(node => node.type === 'MD.bold' && node.value === '聚灵阵盘'));
  assert.ok(row.value.some(node => node.type === 'MD.text' && node.value === ' #33'));
  const pageLinks = nodes.filter(node => node.type === 'MD.button');
  assert.deepEqual(pageLinks.map(link => [link.value, link.options?.data]), [
    ['‹上一页›', `${bag} 1`],
    ['‹返回阵法›', '/洞府阵法'],
    ['‹灵田›', '/灵田']
  ]);
  assert.ok(pageLinks.every(link => link.options?.autoEnter === false && !Object.hasOwn(link.options ?? {}, 'show')));
  assert.ok(
    row.value.some(
      node =>
        node.type === 'MD.button' &&
        node.options?.data === '/激活阵盘 8002' &&
        node.options.autoEnter === false &&
        !Object.hasOwn(node.options, 'show')
    )
  );
  assert.equal(requests.length, 3);
});

for (const isPrivate of [false, true]) for (const mode of ['empty', 'active', 'created', 'refreshed', 'replaced', 'removed']) test(`formation original result ${mode} private=${isPrivate}`, async t => {
 const entry = mode === 'empty' || mode === 'active' ? entries[0] : mode === 'removed' ? entries[2] : entries[1];
 const data = mode === 'empty' ? [] : mode === 'active' ? [{ ...formation, categoryLabel: '隐匿阵', remainingText: '1小时59分' }] : mode === 'removed' ? { removed: true, outcome: 'removed', replaced: false, category: formation.formationCategory, name: formation.formationName, durationHours: 12, formation } : { outcome: mode, replaced: mode === 'replaced', replacedFormationName: mode === 'replaced' ? '原同类阵法' : null, name: formation.formationName, durationHours: 12, formation };
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data)); const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' }); const result = await app.runHandler(entry.handler, event); const view = inspectMessage(result.messages[0].nodes);
 assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, entry.args); assert.ok(view.text.includes(mode === 'empty' ? '暂无生效中的洞府阵法' : '隐息阵')); if (mode === 'empty') { assert.ok(view.text.includes('空列表不证明阵盘丢失')); assert.ok(view.commands.includes('/灵田')); noWrite(view.commands); } else if (mode === 'active') { assert.ok(view.text.includes('1小时59分')); assert.ok(view.text.includes('原实际效果')); assert.ok(view.commands.includes('/移除阵法 隐息阵')); } else if (mode === 'removed') assert.ok(view.text.includes('你已移除')); else { assert.ok(view.text.includes('12 小时')); if (mode === 'replaced') assert.ok(view.text.includes('原同类阵法')); if (mode === 'refreshed') assert.ok(view.text.includes('持续时间已刷新')); }
 assert.equal(result.messages[0].target?.targetId, isPrivate ? event.UserId : event.ChannelId); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) for (const keyword of ['001', '1abc', '1.5', '自定义 阵盘']) test(`formation original keyword ${keyword} private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '未找到可激活的阵盘', buttons: [], advice: [] }])); const text = '/激活阵盘 ' + keyword; const result = await app.runHandler(activate, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); assert.equal(requests.length, 1); assert.deepEqual(requests[0].body.arguments, { keyword }); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
for (const isPrivate of [false, true]) test(`legacy typed zero-hour formation private=${isPrivate}`, async t => {
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { outcome: 'created', replaced: false, name: '', durationHours: 0, formation: { ...formation, formationKey: '', formationName: '', formationEffect: '' } })); const text = '/激活阵盘 自定义阵盘'; const result = await app.runHandler(activate, isPrivate ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' })); assert.equal(requests.length, 1); assert.ok(result.messages[0].text.includes('0 小时')); assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
