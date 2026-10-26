import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import item from '../../src/response/itemDetail/res';
import skill from '../../src/response/skillBook/detail/res';
import soul from '../../src/response/soulArtifact/detail/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const cases = [
  { handler: item, op: 'items.detail', command: '/物品详情', args: { name: '' }, reason: '物品名称参数无效', expected: '/储物袋', text: '模板编号不等于背包实例编号' },
  { handler: item, op: 'items.detail', command: '/物品详情 装备 99', args: { category: 'equipment', entryId: 99 }, reason: '物品详情服务未配置', expected: '/储物袋', text: '未找到模板或查询失败不证明持有物品丢失' },
  { handler: skill, op: 'skill-books.detail', command: '/查看功法', args: { bookId: null }, reason: '❌ 参数错误\n编号参数不能为空', expected: '/我的功法', text: '未学习的秘籍不适用此入口' },
  { handler: skill, op: 'skill-books.detail', command: '/查看功法 abc', args: { bookId: 'abc' }, reason: '❌ 参数错误\n编号必须是大于0的数字', expected: '/我的功法', text: '本人当前已学功法列表' },
  { handler: skill, op: 'skill-books.detail', command: '/查看功法 99', args: { bookId: '99' }, reason: '❌ 功法ID错误\n找不到ID为 99 的已学功法', expected: '/我的功法', text: '不使用模板编号，未学习的秘籍不适用此入口' },
  { handler: skill, op: 'skill-books.detail', command: '/查看功法 99', args: { bookId: '99' }, reason: '❌ 暂无已学习的功法', expected: '/储物袋 功法', text: '未学习的秘籍不适用此已学详情入口' },
  { handler: soul, op: 'soul-artifacts.detail', command: '/本命物详情', args: { instanceId: null }, reason: '请输入本命物实例编号\n用法：/本命物详情 123', expected: '/储物袋 本命', text: '页内序号不能替代实例编号' },
  { handler: soul, op: 'soul-artifacts.detail', command: '/本命物详情 99', args: { instanceId: '99' }, reason: '未找到该本命物，可能已不存在或不属于你', expected: '/我的本命物', text: '已炼化的本命物不在未炼化背包显示' },
  { handler: soul, op: 'soul-artifacts.detail', command: '/本命物详情 99', args: { instanceId: '99' }, reason: '本命物服务尚未配置', expected: '/储物袋 本命', text: '查询失败不证明实例已被消耗' }
];
for (const entry of cases) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback']) {
  test(`${entry.command} ${entry.reason} ${mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'http' ? { code: 'CONFLICT', message: entry.reason }
      : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: entry.reason, blocks: [{ text: entry.reason, quoted: false }], buttons: [], advice: [] }]), mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.op));
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    assert.equal(view.text.split(entry.reason).length - 1, 1);
    assert.ok(view.text.includes(entry.text), view.text);
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(炼化|解锁|升级功法|学习功法|卸下)\s/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const entry of [cases[1], cases[4], cases[7]]) for (const isPrivate of [false, true]) for (const mode of ['malformed', 'structured']) {
  test(`${entry.op} ${mode} private=${isPrivate}`, async t => {
    const { app, requests } = await gameFixture(t, request => mode === 'malformed' ? businessEnvelope(request.bid, {})
      : businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: '原拒绝', quote: '原引用', blocks: [{ text: '原说明', quoted: true }], buttons: [{ label: '原返回', command: '/我' }], advice: [{ command: '/我的信息', description: '原服务建议' }] }]));
    const event = isPrivate ? app.events.privateMessage({ text: entry.command, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    if (mode === 'structured') {
      for (const text of ['原拒绝', '原引用', '原说明', '原服务建议']) assert.ok(view.text.includes(text), view.text);
      for (const command of ['/我', '/我的信息']) assert.ok(view.commands.includes(command));
    } else {
      assert.ok(view.commands.includes(entry.handler === item ? '/储物袋' : entry.handler === skill ? '/我的功法' : '/储物袋 本命'));
      assert.ok(view.text.includes('失败') || view.text.includes('不完整'));
    }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
const template = (category: string, id: number) => ({ category, record: { id, name: '同名', ...(category === 'equipment' ? { equipmentType: '武器' } : {}), ...(category === 'skill_book' ? { skill: null } : {}) },
  grade: null, lore: null, equipmentSet: null, setEffects: [], sources: { stages: [], dungeons: [], recipes: [], shops: [], guildShop: [], materials: [] }, view: [{ kind: 'text', text: '原模板面板' }, { kind: 'source', text: '原获取途径', command: '/查看主线' }] });
for (const isPrivate of [false, true]) for (const mode of ['empty-name', 'empty-id', 'no-input', 'single', 'collision']) {
  test(`item template ${mode} private=${isPrivate}`, async t => {
    const entries = mode === 'collision' ? ['item', 'equipment', 'profession_tool', 'skill_book'].map((category, index) => template(category, index + 9)) : mode === 'single' ? [template('item', 9)] : [];
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { memorial: null, entries }));
    const command = mode === 'no-input' ? '/物品详情' : mode === 'empty-id' ? '/物品详情 装备 99' : '/物品详情 同名';
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(item, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].body.arguments, mode === 'empty-id' ? { category: 'equipment', entryId: 99 } : { name: mode === 'no-input' ? '' : '同名' });
    if (mode === 'single' || mode === 'collision') {
      assert.ok(view.text.includes('原模板面板'));
      assert.ok(view.commands.includes('/查看主线'));
    } else assert.ok(view.commands.includes('/储物袋'));
    if (mode === 'empty-name') assert.ok(view.text.includes('未找到名为「同名」'));
    if (mode === 'empty-id') { assert.ok(view.text.includes('未找到装备模板（编号 99）')); assert.ok(!view.text.includes('名为「装备 99」')); }
    if (mode === 'no-input') assert.ok(view.text.includes('请输入物品名称'));
    if (mode === 'collision') {
      assert.ok(view.text.includes('存在跨分类同名模板'));
      for (const [index, category] of ['物品', '装备', '天工', '功法'].entries()) assert.ok(view.commands.includes(`/物品详情 ${category} ${index + 9}`));
      assert.ok(view.text.includes('不代表本人持有该实例'));
    } else assert.ok(!view.text.includes('存在跨分类同名模板'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
