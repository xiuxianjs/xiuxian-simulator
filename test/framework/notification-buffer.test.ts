import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { after, test, type TestContext } from 'node:test';
import axios from 'axios';
import { createResult, onResponse, ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { notificationChannel } from '../../src/notification/channel';
import { withNotificationBuffer } from '../../src/notification/flymailBuffer';
import { notificationNoticeData, notificationSettingsData } from '../../src/notification/presentation';

after(() => shutdownLogger());
const turn = () => new Promise<void>(resolve => setImmediate(resolve));
const content = (value: string) => notificationNoticeData([{ type: 'Text', value }]);
const target = { platform: 'qq-bot', BotId: 'bot', scope: 'group' as const, targetId: 'group' };

function fixture(t: TestContext) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const login = process.env.login; process.env.login = 'qq-bot';
  t.after(() => { if (login === undefined) delete process.env.login; else process.env.login = login; });
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'http://offline.invalid', worker_token: 'test-token' } } } });
  t.after(() => app.dispose());
  return app;
}

// 缓冲属于原生业务定时器，与框架 app.clock 分开控制。
test('普通通知固定 30s 合并且不同玩家即使同群也隔离', async t => {
  const app = fixture(t);
  t.mock.method(axios, 'create', () => ({ async post(path: string) {
    const data = path.endsWith('/permission/read') ? { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' }
      : path.endsWith('/availability/read') ? { available: true, updatedAt: 1 } : null;
    return { data: { data } };
  } }));
  let sends = 0;
  app.actions.on('message.send.target', () => { sends++; return [createResult(ResultCode.Ok, '送达', { id: String(sends) })]; });
  const result = await app.runHandler(onResponse('message.create', async () => {
    const first = withNotificationBuffer('7', () => notificationChannel.send(target, notificationSettingsData(content('首条'), 'cave.plot.matured'), null));
    t.mock.timers.tick(1_000);
    const second = withNotificationBuffer('7', () => notificationChannel.send(target, notificationSettingsData(content('后来'), 'forge.order.expired'), null));
    const other = withNotificationBuffer('8', () => notificationChannel.send(target, content('另群'), null));
    const bot = withNotificationBuffer('7', () => notificationChannel.send({ ...target, BotId: 'other-bot' }, content('另一机器人'), null));
    t.mock.timers.tick(28_999);
    await turn();
    assert.equal(sends, 0);
    t.mock.timers.tick(1);
    await turn();
    assert.equal(sends, 1, '首条满 30s 发送，不因后来消息推迟');
    t.mock.timers.tick(1_000);
    await Promise.all([first, second, other, bot]);
  }), app.events.groupMessage({ platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 3);
  const texts = result.messages.map(message => inspectMessage(message.nodes).text);
  assert.match(texts[0], /首条[\s\S]*后来/);
  assert.equal((texts[0].match(/修仙 · 通知/g) ?? []).length, 1);
  assert.ok(!texts[0].includes('通知管理'));
  assert.equal((texts[0].match(/关闭此类通知/g) ?? []).length, 2);
  assert.match(JSON.stringify(result.messages[0].nodes), /通知设置 cave 关闭/);
  assert.match(JSON.stringify(result.messages[0].nodes), /通知设置 forge 关闭/);
  assert.equal(inspectMessage(result.messages[0].nodes).commands.filter(command => command === '/通知设置').length, 1);
  assert.equal(inspectMessage(result.messages[0].nodes).commands.filter(command => command === '/我的通知').length, 1);

  assert.equal(texts.filter(text => text.includes('另群')).length, 1);
  assert.equal(texts.filter(text => text.includes('另一机器人')).length, 1);
  for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
});


test('同批三份普通被打战报共用标题，逐份保留收益、反击截止和战报入口', async t => {
  const app = fixture(t);
  t.mock.method(axios, 'create', () => ({
    async post(path: string) {
      const data = path.endsWith('/permission/read') ? { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' }
        : path.endsWith('/availability/read') ? { available: true, updatedAt: 1 } : null;
      return { data: { data } };
    }
  }));
  app.actions.on('message.send.target', () => [createResult(ResultCode.Ok, '送达', { id: 'pk-notice' })]);
  const rows = [[22033, '00:23:51'], [22035, '00:23:57'], [22036, '00:24:04']] as const;
  const noticeText = (id: number, deadline?: string, item?: string) => [
    '【受到打劫】',
    '',
    `普通被打战报 #${id}`,
    '',
    '结果：本次普通被打已结算',
    ...(deadline ? [
      `反击截止：2026-11-17 ${deadline}（北京时间）`,
      '反击机会：本战报仅一次免费反击',
      '交战实力：以反击时双方当前实力为准'
    ] : []),
    ...(item ? ['', `物品：${item}`, '反击成功：恢复原物'] : []),
    '',
    '本次被打获得修为40',
    ...(deadline ? ['免费反击完成后，', '按本战报相同秘境基准再获等量修为。', '', '货币：已即时结算，', '反击不退款', '已结束的记录不能再次反击。'] : []),
    '',
    `查看战报：/争夺战报 ${id}`
  ].join('\n');
  const send = (owner: string, text: string, source = 'pk.ordinary') => withNotificationBuffer(owner, () =>
    notificationChannel.send(target, notificationSettingsData(notificationNoticeData([{ type: 'Text', value: text }], source), source), null)
  );

  const result = await app.runHandler(onResponse('message.create', async () => {
    const pending = [
      send('7', noticeText(...rows[0])),
      send('7', '【灵田作物已成熟】\n\n灵田已成熟。', 'cave.plot.matured'),
      send('7', noticeText(...rows[1])),
      send('7', noticeText(...rows[2])),
      send('8', noticeText(22037, undefined, '原物暂存中'))
    ];
    t.mock.timers.tick(30_000);
    await Promise.all(pending);
  }), app.events.groupMessage({ platform: 'qq-bot' }));

  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 2);
  for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const batch = result.messages.find(message => message.commands.includes('/争夺战报 22033'))!;
  const view = inspectMessage(batch.nodes);
  assert.equal(view.text.split('受到打劫').length - 1, 1);
  assert.match(view.text, /受到打劫 · 3 条/);
  assert.equal(view.text.split('截止时间为北京时间').length - 1, 1);
  assert.doesNotMatch(view.text, /本次普通被打已结算|本战报仅一次|交战实力|反击不退款|查看战报：/);
  assert.deepEqual(view.commands.filter(command => command.startsWith('/争夺战报 ')), rows.map(([id]) => `/争夺战报 ${id}`));
  assert.equal(view.commands.filter(command => command === '/通知设置 pk 关闭').length, 1);
  assert.equal(view.commands.filter(command => command === '/通知设置').length, 1);
  assert.equal(view.commands.filter(command => command === '/我的通知').length, 1);
  assert.ok(view.commands.includes('/灵田'));
  assert.ok(view.commands.includes('/通知设置 cave 关闭'));
  assert.ok(!view.commands.some(command => command.startsWith('/回击')));
  const quotes = batch.nodes.flatMap(block => block.type === 'Markdown'
    ? block.value.flatMap(node => node.type === 'MD.blockquote' && Array.isArray(node.value) ? [node.value] : [])
    : []);
  for (const [id, deadline] of rows) {
    const quote = quotes.find(nodes => nodes.some(node => node.type === 'MD.text' && node.value === ` #${id}`));
    assert.ok(quote);
    assert.ok(quote.some(node => node.type === 'MD.text' && node.value === `修为：+40 · 反击截止：11-17 ${deadline}`));
    const button = quote.find(node => node.type === 'MD.button');
    assert.equal(button?.options?.data, `/争夺战报 ${id}`);
    assert.equal(button?.options?.autoEnter, false);
  }

  const single = result.messages.find(message => message.commands.includes('/争夺战报 22037'))!;
  assert.match(single.text, /受到打劫 · 1 条/);
  assert.match(single.text, /物品：原物暂存中/);
  assert.doesNotMatch(single.text, /反击截止|截止时间为北京时间/);
  const output = process.env.PK_NOTIFICATION_PREVIEW_OUTPUT;
  if (output) writeFileSync(output, JSON.stringify({ before: rows.map(([id, deadline]) => noticeText(id, deadline)), after: view.text, commands: view.commands }));
});

test('反击到期战报合并共用说明，各自保留交付进度和战报按钮', async t => {
  const app = fixture(t);
  t.mock.method(axios, 'create', () => ({
    async post(path: string) {
      const data = path.endsWith('/permission/read') ? { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' }
        : path.endsWith('/availability/read') ? { available: true, updatedAt: 1 } : null;
      return { data: { data } };
    }
  }));
  app.actions.on('message.send.target', () => [createResult(ResultCode.Ok, '送达', { id: 'pk-expired-notice' })]);
  const expiry = (id: number, role = '受袭者', details: string[] = []) => [
    '【反击窗口结束】', '', `你的身份：${role}`, `普通打劫战报#${id}`, '',
    '反击状态：窗口已结束', ...details, '货币：灵石、灵晶结算不变', '', `查看战报：/争夺战报 ${id}`
  ].join('\n');
  const sample = [expiry(18960), expiry(18962)];
  const send = (owner: string, text: string, source = 'pk.expired') => withNotificationBuffer(owner, () =>
    notificationChannel.send(target, notificationSettingsData(notificationNoticeData([{ type: 'Text', value: text }], source), source), null)
  );
  const result = await app.runHandler(onResponse('message.create', async () => {
    const pending = [
      send('7', sample[0]),
      send('7', sample[1]),
      send('8', expiry(19001, '受袭者', ['物品：归属已确定，', '待交付', '处理：系统后台继续交付，', '不占用角色', '原物归属：原打劫者'])),
      send('8', '【受到打劫】\n\n普通被打战报 #22033\n\n结果：本次普通被打已结算\n本次被打获得修为40', 'pk.ordinary'),
      send('8', expiry(19002, '原打劫者', ['物品：暂存原物已交付原打劫者']))
    ];
    t.mock.timers.tick(30_000);
    await Promise.all(pending);
  }), app.events.groupMessage({ platform: 'qq-bot' }));

  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 2);
  for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);

  const batch = result.messages.find(message => message.commands.includes('/争夺战报 18960'))!;
  const view = inspectMessage(batch.nodes);
  assert.equal(view.text.split('反击窗口结束').length - 1, 1);
  assert.equal(view.text.split('身份：受袭者 · 货币：灵石、灵晶结算不变').length - 1, 1);
  assert.doesNotMatch(view.text, /你的身份|反击状态：|查看战报：/);
  assert.deepEqual(view.commands.filter(command => command.startsWith('/争夺战报 ')), ['/争夺战报 18960', '/争夺战报 18962']);
  assert.equal(view.commands.filter(command => command === '/通知设置').length, 1);
  assert.equal(view.commands.filter(command => command === '/我的通知').length, 1);

  const mixed = result.messages.find(message => message.commands.includes('/争夺战报 19001'))!;
  assert.equal(mixed.text.split('货币：灵石、灵晶结算不变').length - 1, 1);
  assert.match(mixed.text, /反击窗口结束 · 2 条/);
  assert.match(mixed.text, /受到打劫 · 1 条/);
  assert.equal(mixed.commands.filter(command => command === '/通知设置 pk 关闭').length, 1);
  assert.ok(mixed.commands.includes('/争夺战报 22033'));
  const quotes = mixed.nodes.flatMap(block => block.type === 'Markdown'
    ? block.value.flatMap(node => node.type === 'MD.blockquote' && Array.isArray(node.value) ? [node.value] : [])
    : []);
  for (const [id, role, details] of [
    [19001, '受袭者', ['物品：归属已确定，待交付', '处理：系统后台继续交付，不占用角色', '原物归属：原打劫者']],
    [19002, '原打劫者', ['物品：暂存原物已交付原打劫者']]
  ] as const) {
    const quote = quotes.find(nodes => nodes.some(node => node.type === 'MD.text' && node.value === ` #${id}`));
    assert.ok(quote);
    for (const line of [`身份：${role}`, ...details]) assert.ok(quote.some(node => node.type === 'MD.text' && node.value === line));
    const button = quote.find(node => node.type === 'MD.button');
    assert.equal(button?.options?.data, `/争夺战报 ${id}`);
    assert.equal(button?.options?.autoEnter, false);
  }
  assert.ok(!mixed.commands.some(command => command.startsWith('/回击')));
  const output = process.env.PK_EXPIRY_PREVIEW_OUTPUT;
  if (output) writeFileSync(output, JSON.stringify({ before: sample, after: view.text, commands: view.commands, mixed: mixed.text }));
});

test('非飞信通知提取共用标题与列表入口，保留逐条到账金额和限定战报', async t => {
  const app = fixture(t);
  t.mock.method(axios, 'create', () => ({
    async post(path: string) {
      const data = path.endsWith('/permission/read') ? { state: { state: 'allowed', source: 'event', updatedAt: 1 }, raw: '' }
        : path.endsWith('/availability/read') ? { available: true, updatedAt: 1 } : null;
      return { data: { data } };
    }
  }));
  app.actions.on('message.send.target', () => [createResult(ResultCode.Ok, '送达', { id: 'grouped-system-notice' })]);
  const mail = (name: string, titled = true) => `${titled ? '【收到新邮件】\n\n' : ''}邮件：「${name}」\n\n查收：/我的邮件`;
  const bounty = (id: number, amount: number) => `【悬赏赏金已入账】\n\n悬赏：#${id}\n赏金：灵晶 +${amount}\n状态：已自动发放\n\n查看：/我`;
  const pk = (id: number, amount: number, status: string) => [
    '【反击获胜】', '', '你的身份：受袭者', `普通打劫战报#${id}`, '', '反击结果：受袭者获胜',
    '反击机会：已使用', `物品：${status}`, '货币：灵石、灵晶结算不变', `本次反击获得修为${amount}。`, '', `查看战报：/争夺战报 ${id}`
  ].join('\n');
  const items = [
    ['7', 'scheduled.email.sent', mail('月初补给')],
    ['7', 'bounty.expired.reward', bounty(310, 15)],
    ['7', 'scheduled.email.sent', mail('宗门答谢', false)],
    ['7', 'bounty.expired.reward', bounty(311, 30)],
    ['8', 'pk.counter_won', pk(71, 40, '暂存原物已恢复原主使用')],
    ['8', 'pk.counter_won', pk(72, 50, '归属已确定，待交付')]
  ] as const;
  const result = await app.runHandler(onResponse('message.create', async () => {
    const pending = items.map(([owner, source, value]) => withNotificationBuffer(owner, () =>
      notificationChannel.send(target, notificationSettingsData(notificationNoticeData([{ type: 'Text', value }], source), source), null)
    ));

    t.mock.timers.tick(30_000);
    await Promise.all(pending);
  }), app.events.groupMessage({ platform: 'qq-bot' }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 2);
  for (const message of result.messages) assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);

  const general = result.messages.find(message => message.commands.includes('/我的邮件'))!;
  assert.match(general.text, /收到新邮件 · 2 条/);
  assert.match(general.text, /悬赏赏金已入账 · 2 条/);
  for (const fact of ['月初补给', '宗门答谢', '#310', '#311', '灵晶 +15', '灵晶 +30']) assert.ok(general.text.includes(fact));
  assert.doesNotMatch(general.text, /查收：\/我的邮件|查看：\/我/);
  assert.match(general.text, /关闭其他及旧版通知/);
  for (const command of ['/我的邮件', '/我', '/悬赏榜', '/通知设置 other 关闭']) {
    assert.equal(general.commands.filter(value => command === value).length, 1);
  }

  const reports = result.messages.find(message => message.commands.includes('/争夺战报 71'))!;
  assert.match(reports.text, /反击获胜 · 2 条/);
  assert.equal(reports.text.split('货币：灵石、灵晶结算不变').length - 1, 1);
  assert.doesNotMatch(reports.text, /查看战报：/);
  assert.deepEqual(reports.commands.filter(value => value.startsWith('/争夺战报 ')), ['/争夺战报 71', '/争夺战报 72']);
  const quotes = reports.nodes.flatMap(block => block.type === 'Markdown'
    ? block.value.flatMap(node => node.type === 'MD.blockquote' && Array.isArray(node.value) ? [node.value] : [])
    : []);
  for (const [id, amount, status] of [[71, 40, '暂存原物已恢复原主使用'], [72, 50, '归属已确定，待交付']] as const) {
    const quote = quotes.find(nodes => nodes.some(node => node.type === 'MD.button' && node.options?.data === `/争夺战报 ${id}`));
    assert.ok(quote);
    assert.ok(quote.some(node => node.type === 'MD.text' && node.value === `修为：+${amount}`));
    assert.ok(quote.some(node => node.type === 'MD.text' && node.value === `物品：${status}`));
  }

  const output = process.env.SYSTEM_NOTIFICATION_PREVIEW_OUTPUT;
  if (output) writeFileSync(output, JSON.stringify({ before: items.map(([owner, source, value]) => ({ owner, source, value })), general: general.text, reports: reports.text }));
});
