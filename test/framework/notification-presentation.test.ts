import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import axios from 'axios';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { createResult, Format, onResponse, ResultCode, shutdownLogger, useMessage, type DataEnums } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { notificationNoticeData } from '../../src/notification/presentation';
import { PushMessageTask } from '../../src/task/pushMessageTask';
import companionAccept from '../../src/response/companion/accept/res';
import teamApplications from '../../src/response/team/applications/res';
import competitionReward from '../../src/response/guildCompetition/claimReward/res';
import marketListings from '../../src/response/market/my/res';
import { parseTribulationCommand } from '../../src/response-apps/tribulation/app';
import { businessEnvelope, gameFixture } from './fixture';

// 框架时钟由 createTestApp 管理，单独冻结业务中的延迟平台 Hook。
before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(() => { mock.timers.reset(); shutdownLogger(); });

test('纯文本通知实际发送 Markdown，业务入口与原文保留在同一引用块', async t => {
  const app = createTestApp();
  t.after(() => app.dispose());
  const cases = [
    ['black-box.announcement', '查看本场：/黑盒排期 18:40', '/黑盒排期 18:40'],
    ['black-box.announcement', '开场召集\n查看本场：/黑盒拍卖 18:20', '/黑盒排期 18:20'],
    ['black-box.announcement', '查看本场：/黑盒拍卖 25:00', '/黑盒排期'],
    ['black-box.reminder', '你预约的黑盒拍卖会已进入确认窗口；请私聊查看。', '/黑盒记录'],
    ['black-box.opening', '点击入场：/黑盒入场 1 D01-1200-C', '/黑盒入场 1 D01-1200-C'],
    ['black-box.started', '本人查看：/黑盒详情 1 D01-1200-C', '/黑盒详情 1 D01-1200-C'],
    ['black-box.admission', '仅1人，流拍，未扣款。', '/黑盒记录'],
    ['black-box.result', '私聊查看退款：/黑盒详情 1 D01-1200-C', '/黑盒详情 1 D01-1200-C'],
    ['black-box.result', '私聊查看退款：/黑盒详情 1 D01-1200-Cxxx', '/黑盒记录'],
    ['black-box.result', '你参与的黑盒拍卖会已结算；请私聊查看本人记录。', '/黑盒记录'],
    ['pk.ordinary', '普通被打战报 #42\n反击截止：服务端原文', '/争夺战报 42'],
    ['pk.delivery', '普通打劫战报#42：原物已交付', '/争夺战报 42'],
    ['pk.expired', '旧通知未提供编号', '/打劫记录'],
    ['meditation.limit', '闭关累计已达上限', '/出关'],
    ['exploration.completed', '本轮探索已结束', '/返程'],
    ['cave.plot.matured', '灵田已成熟', '/灵田'],
    ['forge.order.expired', '材料已退回', '/锻造委托'],
    ['tribulation.reminder', '确认窗口即将结束', '/我的渡劫'],
    ['tribulation.settled', '本次渡劫成功\n事件：73\n本人查看：/渡劫结算 73', '/渡劫结算 73'],
    ['tribulation.settled', '旧记录缺少有效编号 /渡劫结算 9007199254740992', '/我的渡劫'],
    ['friend.request.created', '收到新的好友申请', '/好友申请'],
    ['friend.request.accepted', '你的申请已同意', '/我的好友'],
    ['companion.proposal.created', '收到道侣申请', '/同意道侣'],
    ['companion.proposal.accepted', '已结为道侣', '/我的道侣'],
    ['companion.anniversary.gift', '周年礼物已通过邮件发放', '/我的邮件'],
    ['master.proposal.created', '收到拜师申请', '/同意拜师'],
    ['master.graduation.created', '收到出师申请', '/同意出师'],
    ['master.relation.removed', '师徒关系已解除', '/我的师门'],
    ['team.invitation:12:created', '收到队伍邀请', '/我的队伍邀请'],
    ['team.invitation:12:rejected', '你发出的邀请已被拒绝', '/我的队伍'],
    ['team.application:12:created', '队伍收到入队申请', '/队伍申请'],
    ['team.application:12:approved', '入队申请已被同意', '/我的队伍'],
    ['team.application:12:rejected', '入队申请已被拒绝', '/我的队伍申请'],
    ['team.match', '匹配超时\n3分钟内未匹配到合适队伍', '/查看秘境'],
    ['team.match', '匹配成功\n已加入队伍：12', '/我的队伍'],
    ['team:12:leader-inherited', '你已成为队长', '/我的队伍'],
    ['guild.application.approved', '入宗申请已通过', '/我的宗门'],
    ['guild.application.rejected', '入宗申请已拒绝', '/宗门列表'],
    ['guild.member.kicked', '你已被移出宗门', '/宗门列表'],
    ['guild.leadership.transfer', '你现在是新宗主', '/我的宗门 管理'],
    ['guild.competition.reward', '宗门大比奖励待领取', '/领取宗门大比奖励'],
    ['market.listing.expired', '挂单到期，物品已返还', '/我的上架'],
    ['scheduled.email.sent', '收到新邮件', '/我的邮件'],
    ['bounty.expired.reward', '赏金已自动发放', '/我'],
    ['bounty.expired.refund', '未使用赏金已退还', '/我'],
    ['flymail.message.received', '旧飞信缺少会话元数据', '/飞信'],
    ['future.source', '未知来源保留原文', '/我的通知'],
    ['', '旧消息池通知', '/我的通知']
  ];
  for (const [source, text, command] of cases) {
    for (const privateChat of [false, true]) {
      const handler = onResponse(['message.create', 'private.message.create'], async () => {
        const [message] = useMessage();
        await message.send({ format: notificationNoticeData([{ type: 'Text', value: text }], source) });
      });
      const event = privateChat ? app.events.privateMessage({ platform: 'qq-bot' }) : app.events.groupMessage({ platform: 'qq-bot' });
      const result = await app.runHandler(handler, event);
      assert.deepEqual(result.errors, []);
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      const quotes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value.filter(child => child.type === 'MD.blockquote') : []);
      assert.equal(quotes.length, 1, source);
      const quote = quotes[0];
      if (quote.type !== 'MD.blockquote' || !Array.isArray(quote.value)) throw new Error('Expected structured quote');
      const view = inspectMessage([{ type: 'Markdown', value: quote.value }]);
      for (const line of text.split('\n')) assert.ok(view.text.includes(line), source);
      assert.ok(view.commands.includes(command), source);
      assert.ok(view.commands.includes('/我的通知'), source);
      assert.ok(!view.commands.some(value => value.startsWith('/反击')), source);
    }
  }
});

test('点击通知入口运行真实业务处理器，申请列表继续提供同意拒绝，领奖提交现有接口', async t => {
  const cases = [
    { source: 'companion.proposal.created', text: '收到道侣申请', handler: companionAccept,
      operation: 'companion.accept', args: { name: '' },
      data: { mode: 'list', received: [{ proposalId: 9, proposerId: 2, fromName: '申请道友', intimacy: 10, createdAt: '2026-10-21T00:00:00Z' }] },
      expected: '申请道友', commands: ['/同意道侣 申请道友', '/拒绝道侣 申请道友'] },
    { source: 'team.application:12:created', text: '收到入队申请', handler: teamApplications,
      operation: 'teams.applications', args: {},
      data: { leaderName: '队长', applications: [{ id: 9, userId: 2, teamId: 12, userName: '申请道友' }] },
      expected: '申请道友', commands: ['/队伍同意 9', '/队伍拒绝 9'] },
    { source: 'guild.competition.reward', text: '奖励待领取', handler: competitionReward,
      operation: 'competition.reward-claim', args: {},
      data: { message: '大比奖励已领取', receipt: { code: 'SPIRIT_CRYSTAL', changeAmount: 5, beforeAmount: 10, afterAmount: 15, detail: '大比奖励' } },
      expected: '大比奖励已领取', commands: ['/宗门大比'] },
    { source: 'market.listing.expired', text: '物品已返还', handler: marketListings,
      operation: 'market.my-listings', args: { page: 1 },
      data: { items: [], pagination: { currentPage: 1, totalPages: 0, total: 0 } },
      expected: '暂无上架物品', commands: ['/珍宝楼'] }
  ];
  for (const row of cases) {
    await t.test(row.source, async t => {
      const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, row.data));
      const notice = notificationNoticeData([{ type: 'Text', value: row.text }], row.source);
      const command = inspectMessage(notice).commands[0];
      const result = await app.runHandler(row.handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
      assert.deepEqual(result.errors, []);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].path, `/api/v2/robot/business/${row.operation}`);
      assert.deepEqual(requests[0].body.arguments, row.args);
      assert.equal(requests[0].body.messageText, command);
      assert.equal(result.messages.length, 1);
      const message = result.messages[0];
      assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
      const view = inspectMessage(message.nodes);
      assert.ok(view.text.includes(row.expected));
      for (const command of row.commands) assert.ok(view.commands.includes(command), command);
    });
  }
  const notice = notificationNoticeData([{ type: 'Text', value: '本人查看：/渡劫结算 73' }], 'tribulation.settled');
  assert.deepEqual(parseTribulationCommand(inspectMessage(notice).commands[0]), { kind: 'receipt', eventId: 73 });
});

test('已有富内容和空通知保持原样，旧群提及保留且不重复包装', () => {
  for (const data of [[], Format.create().addMarkdown(Format.createMarkdown().addButton('原操作', { data: '/飞信' })).value]) {
    assert.equal(notificationNoticeData(data, 'pk.ordinary'), data);
  }
  const data: DataEnums[] = [{ type: 'Mention', value: 'owner' }, { type: 'Text', value: '旧通知' }];
  const notice = notificationNoticeData(data);
  assert.deepEqual(notice[0], data[0]);
  assert.equal(notificationNoticeData(notice), notice);
  assert.deepEqual(data, [{ type: 'Mention', value: 'owner' }, { type: 'Text', value: '旧通知' }]);
});

test('真实中继任务为玩家与旧消息池发送按钮，归档仍保存原文，成功后才 ack', async t => {
  const previousLogin = process.env.login;
  process.env.login = 'qq-bot';
  t.after(() => { if (previousLogin === undefined) delete process.env.login; else process.env.login = previousLogin; });
  const original = [{ type: 'Text', value: '旧消息池内容' }];
  const queues: Record<string, unknown[]> = {
    'platform.message.dispatch': [{ eventId: 'legacy-event', recipientUserId: 7, recipientBid: 'owner', payload: { messageId: 'legacy-message', uid: 'owner', data: original } }],
    'player.notification.dispatch': [{ eventId: 'player-event', recipientUserId: 7, recipientBid: 'owner', payload: {
      version: 1, recipientUserId: 7, source: 'pk.ordinary', data: [{ type: 'Text', value: '普通被打战报 #42' }]
    } }]
  };
  const archived: unknown[] = [];
  const receipts: unknown[] = [];
  t.mock.method(axios, 'create', () => ({
    async post(path: string, body: Record<string, unknown>) {
      let data: unknown = null;
      if (path.endsWith('/retry')) throw new Error(String(body.error));
      if (path.endsWith('/claim')) data = { event: body.lane === 'flymail' ? null : queues[String(body.eventType)].shift() ?? null };
      else if (path.endsWith('/player/categories')) data = { enabled: true };
    else if (path.endsWith('/legacy-sent-ids')) data = { ids: [] };
      else if (path.endsWith('/subscription')) data = { platform: 'qq-bot', channelId: 'notice-group', botId: 'notice-bot', targetScope: 'group', isEnabled: true, failureCount: 0, lastDeliveryAt: null, lastError: null };
      else if (path.endsWith('/private-target/read')) data = null;
      else if (path.endsWith('/availability/read')) data = { available: true, updatedAt: 1 };
      else if (path.endsWith('/permission/read')) data = { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' };
      else if (path.endsWith('/receipt/read')) data = null;
      else if (path.endsWith('/archive')) archived.push(body.data);
      else if (path.endsWith('/ack')) receipts.push(body.delivery);
      else if (!['/permission/cas', '/permission/failure', '/receipt/store', '/legacy-sent', '/subscription/receipt'].some(suffix => path.endsWith(suffix))) throw new Error(`Unexpected backend request: ${path}`);
      return { data: { data } };
    }
  }));
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'offline-token' } } } });
  t.after(() => app.dispose());
  app.actions.on('message.send.target', () => [createResult(ResultCode.Ok, '送达', { id: 'notice-receipt' })]);
  const handler = onResponse('message.create', async () => { await PushMessageTask(); });
  const result = await app.runHandler(handler, app.events.groupMessage({ platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 2);
  assert.ok(inspectMessage(result.messages[0].nodes).commands.includes('/我的通知'));
  assert.ok(inspectMessage(result.messages[1].nodes).commands.includes('/争夺战报 42'));
  for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  assert.deepEqual(archived, [original]);
  assert.deepEqual(receipts, [{ route: 'group', reason: 'sent' }, { route: 'group', reason: 'sent' }]);
});

for (const [label, privateTarget] of [
  ['有私聊地址', { platform: 'qq-bot', scope: 'c2c', targetId: 'black-box-private', BotId: 'black-box-bot' }],
  ['无私聊地址', null],
  ['旧缓存误存群地址', { platform: 'qq-bot', scope: 'group', targetId: 'black-box-group', BotId: 'black-box-bot' }]
] as const) test(`拍卖和宗门大比下架后通知仅留历史：${label}，不投递且正常确认`, async t => {
  const scratch = mkdtempSync(join(tmpdir(), 'black-box-notice-contracts-'));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  try { goTestFixture(['test', './internal/service', '-run', '^TestBlackBoxNotifications(ReminderBoundary|ResultOnlyAfterCommit)', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)),
    encoding: 'utf8', env: { ...process.env, BLACK_BOX_NOTICE_CONTRACT_OUTPUT: scratch }, maxBuffer: 4 * 1024 * 1024
  }); } catch(error) { const failure=error as {stdout?:Buffer;stderr?:Buffer}; throw Error(`${failure.stdout?.toString()??''}${failure.stderr?.toString()??''}`); }
  const events = ['reminder', 'result', 'unbound'].map(stage => JSON.parse(readFileSync(join(scratch, `black-box-${stage}.json`), 'utf8')));
  const legacy = structuredClone(events[0]);
  legacy.eventId += '-legacy-no-optin';
  delete legacy.payload.blackBoxOptIn;
  const announcement = structuredClone(events[0]);
  announcement.eventId += '-old-announcement';
  announcement.payload.source = 'black-box.announcement';
  announcement.payload.blackBoxOptIn = true;
  const competitionEvents = [events[0], events[2]].map((event, index) => {
    const notice = structuredClone(event);
    notice.eventId = `guild.competition.reward:retired:${index}`;
    notice.payload.source = 'guild.competition.reward';
    return notice;
  });
  const queues: Record<string, unknown[]> = { 'platform.message.dispatch': [], 'player.notification.dispatch': [...events, legacy, announcement, ...competitionEvents] };
  const requests: string[] = [], acknowledgements: unknown[] = [];
  let sent = 0;
  const previousLogin = process.env.login;
  process.env.login = 'qq-bot';
  t.after(() => { if (previousLogin === undefined) delete process.env.login; else process.env.login = previousLogin; });
  t.mock.method(axios, 'create', () => ({ async post(path: string, body: Record<string, unknown>) {
    requests.push(path);
    let data: unknown = null;
    if (path.endsWith('/retry')) throw new Error(String(body.error));
    if (path.endsWith('/claim')) data = { event: body.lane === 'flymail' ? null : queues[String(body.eventType)].shift() ?? null };
    else if (path.endsWith('/player/categories')) data = { enabled: true };
    else if (path.endsWith('/legacy-sent-ids')) data = { ids: [] };
    else if (path.endsWith('/subscription')) data = { platform: 'qq-bot', channelId: 'black-box-group', botId: 'black-box-bot', targetScope: 'group', isEnabled: true, failureCount: 0, lastDeliveryAt: null, lastError: null };
    else if (path.endsWith('/private-target/read')) data = privateTarget;
    else if (path.endsWith('/availability/read')) data = { available: true, updatedAt: 1 };
    else if (path.endsWith('/permission/read')) data = { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' };
    else if (path.endsWith('/receipt/read')) data = null;
    else if (path.endsWith('/ack')) { if ((body.delivery as {route:string}).route !== 'history') assert.ok(sent > acknowledgements.length, 'ack before platform success'); acknowledgements.push(body.delivery); }
    else if (!['/permission/cas', '/permission/failure', '/receipt/store', '/legacy-sent', '/subscription/receipt'].some(suffix => path.endsWith(suffix))) throw new Error(`Unexpected request: ${path}`);
    return { data: { data } };
  } }));
  const app = createTestApp({ config: { 'xiuxian-game': { backend: { api_url: 'http://black-box-notice.invalid', worker_token: 'offline-token' } } } });
  t.after(() => app.dispose());
  app.actions.on('message.send.target', () => { sent++; return [createResult(ResultCode.Ok, '隔离送达', { id: `black-box-receipt-${sent}` })]; });
  const handler = onResponse('message.create', async () => { await PushMessageTask(); });
  const result = await app.runHandler(handler, app.events.groupMessage({ platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 0);
  assert.equal(sent, 0);
  assert.equal(acknowledgements.length, 7);
  assert.ok(!requests.some(path => path.endsWith('/subscription') || path.includes('fallback') || path.endsWith('/private-target/read')));
  assert.deepEqual(acknowledgements, Array.from({ length: 7 }, () => ({ route: 'history', reason: 'proactive_disabled' })));
  assert.ok(!requests.some(path => path.includes('/robot/business/') || path.includes('/black-box/')));
});
