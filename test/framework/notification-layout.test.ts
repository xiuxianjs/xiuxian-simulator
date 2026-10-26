import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { onResponse, ResultCode, shutdownLogger, useMessage } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { createMarkdownText } from '../../node_modules/@alemonjs/qq-bot/lib/format.js';
import { flyMailNoticeData } from '../../src/utils/flyMailPresentation';
import { notificationNoticeData } from '../../src/notification/presentation';
import robberyRecords from '../../src/response/robberyRecord/res';
import notificationHistory from '../../src/response/notification/history/res';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(() => { mock.timers.reset(); shutdownLogger(); });

// Inspect structural newline nodes as well as text: a long Text node containing
// escape characters is insufficient proof that the platform receives lines.
function quoteLines(nodes: NonNullable<Parameters<typeof inspectMessage>[0]>) {
  return nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote').map(child => {
    assert.ok(Array.isArray(child.value));
    return child.value as Array<{ type: string; value?: unknown }>;
  }) : []);
}

function assertSeparateActionLine(nodes: Parameters<typeof quoteLines>[0]) {
  const [quote] = quoteLines(nodes);
  const firstButton = quote.findIndex(node => node.type === 'MD.button');
  assert.ok(firstButton > 0);
  const lastNewline = quote.slice(0, firstButton).map(node => node.type).lastIndexOf('MD.newline');
  assert.ok(lastNewline >= 0);
  assert.ok(quote.slice(lastNewline + 1, firstButton).every(node => node.type === 'MD.text' && String(node.value).trim() === ''));
  const rendered = nodes.flatMap(node => node.type === 'Markdown' ? [createMarkdownText(node.value)] : []).join('\n');
  const actionLines = rendered.split('\n').filter(line => line.includes('<qqbot-cmd-'));
  assert.equal(actionLines.length, 1);
  assert.match(actionLines[0], /^>\s*<qqbot-cmd-/);
  assert.equal(actionLines[0].replace(/<qqbot-cmd-(?:input|enter)\b[^>]*\/>/g, '').replace(/^>\s*/, '').trim(), '');
}

test('模板通知保持具体标题、独立换行与战报操作，匹配超时不提供重新排队入口', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  for (const privateChat of [true, false]) {
    for (const row of [
      { source: 'pk.ordinary', title: '受到打劫', body: '普通被打战报 #42\n\n反击截止：2026-10-22 10:00:00（北京时间）\n物品：原物暂存中', command: '/争夺战报 42' },
      { source: 'team.match', title: '组队匹配超时', body: '匹配超时\n目标：主线 桃花镇', command: '/查看秘境' },
      { source: 'guild.red_packet.sent', title: '宗门有新红包', body: '宗门有新的灵石红包。', command: '/宗门红包' },
      { source: 'guild.dissolve', title: '宗门已解散', body: '宗门【青云】已解散。', command: '/宗门列表' }
    ]) {
      const handler = onResponse(['message.create', 'private.message.create'], async () => {
        const [message] = useMessage();
        await message.send({ format: notificationNoticeData([{ type: 'Text', value: `【${row.title}】\r\n\r\n${row.body.replace(/\n/g, '\r\n')}` }], row.source) });
      });
      const result = await app.runHandler(handler, privateChat ? app.events.privateMessage({ platform: 'qq-bot' }) : app.events.groupMessage({ platform: 'qq-bot' }));
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      assert.ok(message.text.includes(row.title));
      assert.equal(message.text.split(row.title).length, 2);
      assert.ok(message.commands.includes(row.command));
      assert.ok(message.commands.includes('/我的通知'));
      assertSeparateActionLine(message.nodes);
      assert.ok(!message.commands.some(command => /^\/(回击|开始匹配)/.test(command)));
      const [quote] = quoteLines(message.nodes);
      const body = row.body.split('\n');
      assert.deepEqual(quote.filter(node => node.type === 'MD.text').map(node => node.value).slice(0, body.length), body);
      assert.ok(quote.filter(node => node.type === 'MD.newline').length >= body.length - 1);
    }
  }
});

test('打劫记录明确进攻视角并分开损失与物品状态，只给允许的记录提供反击', async t => {
  const base = {
    id: 42, attackerUid: 2, attackerName: '青云', attackerDisplayName: '青云', isWin: true,
    stoneReward: 100, crystalReward: 2, droppedItemName: '灵剑', droppedItemQty: 1, targetShaQi: 0,
    isCounterAttack: false, isBounty: false, createdAt: '2026-10-21T00:00:00Z',
    typeText: '⚔️打劫', resultText: '✅成功', lossText: '损失：灵石-100、灵晶-2',
    dropText: '暂存：灵剑×1（已归对方，待交付）', canCounterAttack: false,
    counterStatusText: '反击未获胜，机会已使用', counterDeadline: '2026-10-21T01:00:00Z'
  };
  const records = [base, { ...base, id: 43, isWin: false, lossText: '', dropText: '', canCounterAttack: true, counterStatusText: '可免费反击一次' },
    { ...base, id: 44, isCounterAttack: true, canCounterAttack: false, counterDeadline: undefined, counterStatusText: undefined }];
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { records, currentPage: 1, totalPages: 2, total: 6 }));
  const result = await app.runHandler(robberyRecords, app.events.privateMessage({ text: '/打劫记录', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/pvp.records');
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const quotes = quoteLines(message.nodes);
  assert.equal(quotes.length, 3);
  const texts = quotes.map(quote => quote.filter(node => node.type === 'MD.text').map(node => node.value));
  assert.deepEqual(texts[0], ['【战报 #42】', '时间：2026-10-21 08:00:00', '进攻方：青云', '类型：⚔️打劫', '战斗结果：进攻方获胜', '', '损失：', '灵石 -100', '灵晶 -2', '物品状态：暂存：灵剑×1（已归对方，待交付）', '反击状态：反击未获胜，机会已使用', '反击截止：2026-10-21 09:00:00', ' ']);
  assert.ok(texts[1].includes('战斗结果：进攻方未获胜'));
  assert.ok(texts[2].includes('战斗结果：反击方获胜'));
  assert.ok(message.commands.includes('/回击 43'));
  assert.ok(!message.commands.includes('/回击 42'));
  assert.ok(!message.commands.includes('/回击 44'));
  assert.ok(message.commands.includes('/争夺战报 42'));
  assert.ok(message.commands.includes('/打劫记录 2'));
});

test('通知历史每条独立引用块，保留空行、北京时间与原文，投递状态放在末尾', async t => {
  const items = [
    { id: 'one', time: '2026-10-21T00:00:00Z', text: '【物品交付更新】\n\n普通打劫战报#42\n物品：待交付\n\n查看战报：/争夺战报 42', delivery: '已发送至私聊' },
    { id: 'two', time: '2026-10-20T00:00:00Z', text: '旧通知第一行\n旧通知第二行', delivery: '等待发送，内容可先查阅' }
  ];
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { items, page: 2, hasNext: true }));
  const result = await app.runHandler(notificationHistory, app.events.privateMessage({ text: '/我的通知 2', platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, '/api/v2/robot/business/notifications.history');
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const quotes = quoteLines(message.nodes);
  assert.equal(quotes.length, 2);
  assert.deepEqual(quotes.map(quote => quote.filter(node => node.type === 'MD.text').map(node => node.value)), [
    ['【1】物品交付更新', '时间：2026-10-21 08:00:00', '', '普通打劫战报#42', '物品：待交付', '', '查看战报：/争夺战报 42'],
    ['【2】修仙 · 通知', '时间：2026-10-20 08:00:00', '', '旧通知第一行', '旧通知第二行']
  ]);
  assert.ok(message.commands.includes('/我的通知 1'));
  assert.ok(message.commands.includes('/我的通知 3'));
});


test('私聊飞信保留原始正文和回复，不再构造管理员订阅告警', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const handler = onResponse('private.message.create', async () => {
    const [message] = useMessage();
    const data = flyMailNoticeData({ scope: 'guild', messageId: 1, conversationId: 41, senderUid: 2,
      senderName: '道友', content: '秘密正文，原样展示。\n第二行。', createdAt: '2026-10-20T09:00:00+08:00' }, 1);
    assert.ok(data);
    await message.send({ format: data });
  });
  const result = await app.runHandler(handler, app.events.privateMessage({ platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const [quote] = quoteLines(message.nodes);
  assert.ok(quote.some(node => node.type === 'MD.text' && node.value === '秘密正文，原样展示。\n第二行。'));
  assert.ok(message.commands.includes('/发宗门飞信 '));
  assert.doesNotMatch(message.text, /订阅群|未确认送达/);
});
