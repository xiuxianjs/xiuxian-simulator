import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import tools from '../../src/response/storage/newBag/tiangong/res';
import books from '../../src/response/storage/newBag/skillBooks/res';
import soul from '../../src/response/storage/newBag/soulArtifacts/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const entries = [
  { handler: tools, op: 'storage.profession-tools', text: '/储物袋 天工 火焰 9', args: { args: ['火焰', '9'] } },
  { handler: books, op: 'storage.skill-books', text: '/储物袋 功法 战技 9', args: { args: ['战技', '9'] } },
  { handler: soul, op: 'storage.soul-artifacts', text: '/储物袋 本命 9', args: { args: ['9'] } }
];
for (const entry of entries) for (const isPrivate of [false, true]) for (const mode of ['http', 'feedback', 'malformed', 'structured']) {
  test(`${entry.op} ${mode} private=${isPrivate}`, async t => {
    const reason = '原查询失败';
    const { app, requests } = await gameFixture(t, request => {
      if (mode === 'http') return { code: 'CONFLICT', message: reason };
      if (mode === 'malformed') return businessEnvelope(request.bid, {});
      return businessEnvelope(request.bid, undefined, [{ title: '', heading: '', text: reason, buttons: mode === 'structured' ? [{ label: '原返回', command: '/我' }] : [],
        blocks: [{ text: reason, quoted: false }, { text: '原说明', quoted: true }], quote: '原引用',
        advice: mode === 'structured' ? [{ command: '/我的信息', description: '原服务建议' }] : [] }]);
    }, mode === 'http' ? 409 : 200);
    const event = isPrivate ? app.events.privateMessage({ text: entry.text, platform: 'qq-bot' }) : app.events.groupMessage({ text: entry.text, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    assert.equal(requests.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.op));
    assert.deepEqual(requests[0].body.arguments, entry.args);
    assert.ok(requests[0].idempotencyKey);
    assert.equal(result.messages.length, 1);
    const view = inspectMessage(result.messages[0].nodes);
    if (mode !== 'malformed') assert.ok(view.text.includes(reason));
    if (mode === 'feedback' || mode === 'structured') for (const text of ['原说明', '原引用']) assert.ok(view.text.includes(text));
    if (mode === 'structured') {
      assert.ok(view.text.includes('原服务建议'));
      assert.ok(view.commands.includes('/我的信息'));
      assert.ok(view.commands.includes('/我'));
    } else {
      assert.ok(view.text.includes('无法据此判断物品数量或是否丢失'), view.text);
      assert.ok(view.commands.includes('/储物袋'));
    }
    assert.ok(!view.text.includes('该分类暂无物品'));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
const bags = [
  { handler: tools, op: 'storage.profession-tools', command: '/储物袋 天工 火焰', data: { types: ['火焰'], activeType: '火焰', page: 1, pageSize: 5, total: 0, totalPages: 1, items: [], capabilities: [] }, expected: '/我的职业', empty: '该类型暂无天工工具', missing: '当前未提供替换入口' },
  { handler: books, op: 'storage.skill-books', command: '/储物袋 功法 战技', data: { requestedType: '战技', bag: { skillType: '战技', page: 1, total: 0, totalPages: 1, items: [], capabilities: [] } }, expected: '/我的功法', empty: '该类型暂无功法', missing: '当前未提供学习入口' },
  { handler: soul, op: 'storage.soul-artifacts', command: '/储物袋 本命', data: { page: 1, pageSize: 5, total: 0, items: [] }, expected: '/我的本命物', empty: '暂无本命物', missing: '当前未提供炼化入口' }
];
const stats = { physicalAttack: 12, magicAttack: 0, physicalDefense: 0, magicDefense: 0, hp: 0, speed: 0, physicalAttackPercent: 0, magicAttackPercent: 0, physicalDefensePercent: 0, magicDefensePercent: 0, hpPercent: 0, critRate: 0, critDamage: 0 };
const maxStats = Object.fromEntries(Object.keys(stats).map(key => ['max' + key[0].toUpperCase() + key.slice(1), 20]));
for (const entry of bags) for (const isPrivate of [false, true]) for (const state of ['empty', 'page', 'blocked', 'allowed']) {
  test(`${entry.op} ${state} private=${isPrivate}`, async t => {
    const data = structuredClone(entry.data) as { bag?: Record<string, unknown>; [key: string]: unknown };
    const bag = data.bag ?? data;
    if (state !== 'empty') bag.total = 7;
    if (state === 'page') { bag.page = 9; bag.totalPages = 2; }
    if (state === 'blocked' || state === 'allowed') {
      const allowed = state === 'allowed';
      const item = entry.handler === tools
        ? { id: 101, toolId: 9, displayName: '原工具', displayGrade: '一品', typeName: '火焰', gradeId: 1, isEquipped: 0, isLocked: allowed ? 0 : 1, canReplace: true, canToggleLock: true, capabilities: allowed ? ['replace', 'lock', 'viewDetail'] : ['unlock', 'viewDetail'] }
        : entry.handler === books
          ? { ...stats, ...maxStats, id: 101, skillBookId: 9, status: 1, isLocked: allowed ? 0 : 1, quantity: 1, identifiableCount: 0, displayName: '原功法', displayGrade: '一品', displaySkillType: '战技', unidentified: false, attributeParts: ['物攻:12 / 20'], name: '原功法', gradeId: 1, grade: '一品', realm: '炼气', skillType: '战技', capabilities: allowed ? [{ kind: 'learn' }, { kind: 'viewDetail' }] : [{ kind: 'unlock' }, { kind: 'viewDetail' }] }
          : { id: 101, artifactId: 9, gradeId: 1, name: '原本命物', gradeName: '一品', level: 1, washCount: 2, hasUpgraded: 0, isEquipped: 0, isLocked: allowed ? 0 : 1, canRefine: allowed, canToggleLock: true, lockAction: allowed ? 'lock' : 'unlock' };
      bag.items = [item, { ...item, id: 102 }];
    }
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const command = entry.command + (state === 'page' ? ' 9' : '');
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.equal(result.messages.length, 1);
    assert.ok(requests[0].path.endsWith('/' + entry.op));
    assert.ok(requests[0].idempotencyKey);
    if (state === 'empty') { assert.ok(view.text.includes(entry.empty)); assert.ok(view.commands.includes(entry.expected)); }
    if (state === 'page') {
      assert.ok(view.text.includes('7'));
      assert.ok(view.text.includes('本页为空不等于全部用完'));
      assert.ok(view.commands.includes(entry.handler === tools ? '/储物袋 天工' : entry.handler === books ? '/储物袋 功法' : '/储物袋 本命'));
      assert.ok(!view.text.includes(entry.handler === soul ? '背包只展示未炼化且未上架' : entry.empty));
    }
    if (state === 'blocked') {
      assert.equal(view.text.split(entry.missing).length - 1, 2);
      assert.doesNotMatch(view.text, /建议：/);
      assert.ok(view.commands.includes(entry.expected));
      assert.ok(!view.commands.some(command => /^\/(替换|学习功法|炼化)\s/.test(command)));
    }
    if (state === 'allowed') {
      assert.ok(!view.text.includes(entry.missing));
      assert.ok(!view.text.includes('建议：'));
      const action = entry.handler === tools ? '/替换 101' : entry.handler === books ? '/学习功法 101' : '/炼化 101';
      assert.ok(view.commands.includes(action), view.commands.join(','));
    }
    if (state === 'allowed' || state === 'blocked') {
      assert.ok(view.text.includes(entry.handler === tools ? '原工具' : entry.handler === books ? '原功法' : '原本命物'));
      assert.ok(view.text.includes('一品'));
      assert.ok(view.commands.includes(entry.handler === tools ? '/物品详情 原工具' : entry.handler === books ? '/物品详情 功法 9' : '/本命物详情 101'));
    }
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
for (const isPrivate of [false, true]) for (const kind of ['types', 'batch']) {
  test(`unavailable ${kind} private=${isPrivate}`, async t => {
    const entry = kind === 'types' ? bags[0] : bags[1];
    const data = kind === 'types' ? { ...bags[0].data, types: [], activeType: null } : bags[1].data;
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    const command = entry.command + (kind === 'batch' ? ' 操作' : '');
    const event = isPrivate ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    const result = await app.runHandler(entry.handler, event);
    const view = inspectMessage(result.messages[0].nodes);
    assert.equal(requests.length, 1);
    assert.ok(view.text.includes(kind === 'types' ? '暂无天工类型' : '当前没有可用批量入口'));
    assert.ok(view.commands.includes(entry.expected));
    assert.ok(!view.commands.some(command => /^\/(锁定|解锁|一键分解功法)\s?/.test(command)));
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  });
}
