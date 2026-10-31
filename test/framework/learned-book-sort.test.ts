import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/skillBook/mySkillBooks/res';
import { buildLearnedBookListCommand, createLearnedBookSortRows, LEARNED_BOOK_ATTRIBUTES, parseLearnedBookListCommand } from '../../src/utils/learnedBookSort';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

const numeric = ['upgradeCount', 'physicalAttack', 'magicAttack', 'physicalDefense', 'magicDefense', 'hp', 'physicalAttackPercent', 'magicAttackPercent', 'physicalDefensePercent', 'magicDefensePercent', 'hpPercent', 'speed', 'critRate', 'critDamage', 'maxPhysicalAttack', 'maxMagicAttack', 'maxPhysicalDefense', 'maxMagicDefense', 'maxHp', 'maxPhysicalAttackPercent', 'maxMagicAttackPercent', 'maxPhysicalDefensePercent', 'maxMagicDefensePercent', 'maxHpPercent', 'maxSpeed', 'maxCritRate', 'maxCritDamage'];
const book = (id: number) => ({ ...Object.fromEntries(numeric.map(key => [key, 0])), id, name: `功法${id}`, skillType: '战技', damageType: null, status: 2, statusText: '已学习', listText: `【${id}】功法${id}`, slotText: '装备中的战技', attributeSummary: `物攻(${id}/${id * 2})`, canHide: true, canReset: true, isHidden: 0, proficiency: 65, physicalAttack: id, maxPhysicalAttack: id * 2 });
const data = (displayPage: number) => ({
  displayPage, page: {
    items: (displayPage <= 2 ? [15, 14, 13, 12, 11] : [10]).map(book),
    inUseBooks: [{ ...book(99), status: 3, isHidden: 1 }], total: 6, totalPages: 2, currentPage: Math.max(1, displayPage - 1),
    pageSize: 5, proficiencyPoints: 7, canUseFifthLayerFeature: true
  }
});

for (const privateChat of [false, true]) {
  test(`排序切换进入列表第一页，属性上限、方向和分页保持一致（${privateChat ? '私聊' : '群聊'}）`, async t => {
    const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, data(Number((r.body.arguments as Record<string, unknown>).page ?? 1))));
    const render = async (text: string) => {
      const event = privateChat ? app.events.privateMessage({ text, platform: 'qq-bot' }) : app.events.groupMessage({ text, platform: 'qq-bot' });
      const result = await app.runHandler(handler, event);
      assert.equal(result.messages.length, 1);
      assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
      return result.messages[0];
    };
    const button = (message: Awaited<ReturnType<typeof render>>, label: string) => {
      const node = message.nodes.flatMap(n => n.type === 'Markdown' ? n.value : []).find(n => n.type === 'MD.button' && n.value === `‹${label}›`);
      assert.ok(node?.type === 'MD.button' && node.options?.data);
      return node.options.data;
    };
    const initial = await render('/我的功法 3');
    assert.deepEqual(requests[0].body.arguments, { page: '3' });
    const current = await render(button(initial, '物攻'));
    assert.deepEqual(requests.at(-1)?.body.arguments, { page: '2', sort: { attribute: 'physicalAttack', direction: 'desc', basis: 'current' } });
    const view = inspectMessage(current.nodes);
    assert.match(view.text, /当前物攻↓/);
    assert.ok(view.commands.includes('/查看功法 15'));
    assert.ok(view.commands.includes('/升级功法 15 选择'));
    const maximum = await render(button(current, '属性上限'));
    assert.deepEqual(requests.at(-1)?.body.arguments, { page: '2', sort: { attribute: 'physicalAttack', direction: 'desc', basis: 'max' } });
    const ascending = await render(button(maximum, '从低到高'));
    assert.deepEqual(requests.at(-1)?.body.arguments, { page: '2', sort: { attribute: 'physicalAttack', direction: 'asc', basis: 'max' } });
    const checkButtons = (nodes: unknown[]) => {
      for (const raw of nodes) {
        const node = raw as { type: string; value?: unknown; options?: { data?: string } };
        if (node.type === 'MD.button') {
          assert.equal(typeof node.options?.data, 'string');
          assert.ok(node.options?.data?.trim());
          assert.ok([...node.options!.data!].length <= 80);
        }
        if (Array.isArray(node.value)) checkButtons(node.value);
      }
    };
    checkButtons(ascending.nodes);
    const next = inspectMessage(ascending.nodes).commands.find(c => c === '/我的功法 排序 物攻 升序 上限 3'); assert.ok(next);
    const last = await render(next);
    assert.deepEqual(requests.at(-1)?.body.arguments, { page: '3', sort: { attribute: 'physicalAttack', direction: 'asc', basis: 'max' } });
    assert.match(inspectMessage(last.nodes).text, /功法10/);
    await render(button(last, '默认'));
    assert.deepEqual(requests.at(-1)?.body.arguments, { page: '2' });
    assert.ok(requests.every(r => r.path.endsWith('/skill-books.learned')));
  });
}

test('首页仍显示装备槽位，原页码解析和原列表入口不变', async t => {
  const { app, requests } = await gameFixture(t, r => businessEnvelope(r.bid, data(1)));
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/我的功法', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  assert.deepEqual(requests[0].body.arguments, { page: null });
  const view = inspectMessage(result.messages[0].nodes);
  assert.match(view.text, /装备中的战技/);
  assert.ok(view.commands.includes('/我的功法 2'));
  assert.ok(view.commands.includes('/查看功法 99'));
  assert.deepEqual(parseLearnedBookListCommand('/我的功法 0002 多余'), { page: '0002' });
});

test('全部十三项独立属性均提供排序，固定值与百分比使用不同字段', () => {
  const rows = createLearnedBookSortRows();
  const attributes = rows.flat().filter(button => button.label !== '·默认');
  assert.equal(attributes.length, 13);
  for (const [index, attribute] of LEARNED_BOOK_ATTRIBUTES.entries()) {
    const parsed = parseLearnedBookListCommand(attributes[index].command ?? '');
    assert.deepEqual(parsed, { page: '2', sort: { attribute: attribute.key, direction: 'desc', basis: 'current' } });
    assert.deepEqual(parseLearnedBookListCommand(buildLearnedBookListCommand(parsed.sort, 3)), { ...parsed, page: '3' });
  }
  assert.notEqual(parseLearnedBookListCommand('/我的功法 排序 物攻').sort?.attribute, parseLearnedBookListCommand('/我的功法 排序 物攻%').sort?.attribute);
});
