import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { ResultCode, Router, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import handler from '../../src/response/alchemy/v2/res';



import { parseAlchemyV2Reply } from '../../src/api/bot/alchemy-v2';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });
const reply = {
  title: '炼丹', heading: '', text: '聚灵丹 · 请求100炉 · 当前可炼2炉\n成丹率100.00%',
  blocks: [{ text: '丹火：青纹火\n丹炉：青纹鼎\n灵草 × 4（持有4）', quoted: true, inlineButtons: [{ label: '确认炼制2炉', command: '/炼丹 确认 stable-intent' }] }],
  buttons: [{ label: '丹方', command: '/炼丹 丹方' }], advice: []
};
for (const privateChat of [false, true]) {
  test(`丹方名称加粗，炉数独立成行，保留分页 private=${privateChat}`, async t => {
    const commands = [1, 10, 100].map(count => `/炼丹 预览 7 ${count}`);
    const catalog = {
      ...reply,
      title: '我的洞府 · 炼丹房',
      text: '炼丹师6级 · 每批最多1000炉\n点击丹方下方的炉数按钮查看材料，再确认炼制。',
      blocks: [
        {
          text: '清灵丹\n8级自动掌握 · 未掌握 · 达级自动掌握',
          quoted: true,
          rows: [{ text: '清灵丹', bold: true }, { text: '8级自动掌握 · 未掌握 · 达级自动掌握' }]
        },
        {
          text: '聚灵丹\n1级自动掌握 · 已掌握\n',
          quoted: true,
          rows: [
            { text: '聚灵丹', bold: true },
            { text: '1级自动掌握 · 已掌握' },
            { text: '', inlineButtons: [1, 10, 100].map((count, index) => ({ label: `${count}炉`, command: commands[index] })) }
          ]
        }
      ],
      nav: { current: 2, total: 2, count: 7, command: '/炼丹 丹方 {page}' },
      buttons: [{ label: '返回洞府', command: '/我的洞府' }, { label: '上一页', command: '/炼丹 丹方 1' }]
    };
    const { app } = await gameFixture(t, request => businessEnvelope(request.bid, catalog));
    const event = privateChat ? app.events.privateMessage({ text: '/炼丹 丹方 2', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/炼丹 丹方 2', platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.match(message.text, /‹职业›\s*‹▸丹方›/);
    const nodes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
    const quotes = nodes.filter(node => node.type === 'MD.blockquote');
    assert.equal(quotes.length, 2);
    assert.ok(Array.isArray(quotes[0].value));
    assert.ok(Array.isArray(quotes[1].value));
    const locked = inspectMessage([{ type: 'Markdown', value: quotes[0].value }]);
    const learned = inspectMessage([{ type: 'Markdown', value: quotes[1].value }]);
    assert.deepEqual(locked.commands, []);
    assert.deepEqual(learned.commands, commands);
    assert.equal(quotes[0].value[0].type, 'MD.bold');
    assert.equal(quotes[1].value[0].type, 'MD.bold');
    assert.match(learned.text, /聚灵丹\n1级自动掌握 · 已掌握\n[^\n]*1炉/);
    for (const count of [1, 10, 100]) assert.ok(learned.text.includes(`${count}炉`));
    assert.equal(learned.text.match(/聚灵丹/g)?.length, 1);
    const recipeButtons = quotes[1].value.filter(node => node.type === 'MD.button');
    assert.ok(recipeButtons.every(node => node.options?.autoEnter === false && !Object.hasOwn(node.options ?? {}, 'show')));
    assert.match(message.text, /点击丹方下方的炉数按钮查看材料，再确认炼制/);
    assert.match(message.text, /第2\/2页 · 共7条/);
    const footer = nodes.slice(nodes.indexOf(quotes[1]) + 1).filter(node => node.type === 'MD.button');
    assert.deepEqual(footer.map(node => node.options?.data), ['/炼丹 丹方 1', '/我的洞府']);
  });
  test(`即时预览保持材料与确认同一引用块 private=${privateChat}`, async t => {
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, reply));
    const event = privateChat ? app.events.privateMessage({ text: '/炼丹 预览 1 100', platform: 'qq-bot' }) : app.events.groupMessage({ text: '/炼丹 预览 1 100', platform: 'qq-bot' });
    const result = await app.runHandler(handler, event);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/api/v2/robot/business/alchemy.v2');
    assert.deepEqual(requests[0].body.arguments, {});
    assert.equal(requests[0].body.messageText, '/炼丹 预览 1 100');
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const nodes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
    const quotes = nodes.filter(node => node.type === 'MD.blockquote');
    assert.equal(quotes.length, 1);
    const quote = quotes[0];
    assert.ok(quote.type === 'MD.blockquote' && Array.isArray(quote.value));
    const view = inspectMessage([{ type: 'Markdown', value: quote.value }]);
    assert.match(view.text, /灵草 × 4/);
    assert.deepEqual(view.commands, ['/炼丹 确认 stable-intent']);
    assert.doesNotMatch(message.text, /融臣|熟练度|完美|精品|倒计时/);
  });
}
test('缺料行直达材料图鉴，保留查看材料', async t => {
  const shortage = {
    ...reply,
    text: '培元丹 · 请求1炉 · 当前可炼0炉',
    blocks: [
      { text: '培元草：单炉需3 · 可用0 · 缺3', quoted: true, inlineButtons: [{ label: '获取途径', command: '/图鉴详情 材料 20' }] },
      { text: '元灵果：单炉需2 · 可用2', quoted: true, inlineButtons: [{ label: '查看材料', command: '/储物袋 材料 草药' }] }
    ]
  };
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, shortage));
  const result = await app.runHandler(handler, app.events.groupMessage({ text: '/炼丹 预览 1 1', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const quotes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []).filter(node => node.type === 'MD.blockquote');
  assert.equal(quotes.length, 2);
  assert.ok(Array.isArray(quotes[0].value) && Array.isArray(quotes[1].value));
  const [material, , link] = quotes[0].value;
  assert.ok(material.type === 'MD.text');
  assert.equal(material.value, '培元草：单炉需3 · 可用0 · 缺3');
  assert.ok(link.type === 'MD.link');
  assert.match(link.value.text, /获取途径/);
  const url = new URL(link.value.url!);
  assert.equal(url.pathname, '/components/encyclopedia');
  assert.equal(url.searchParams.get('category'), '材料');
  assert.equal(url.searchParams.get('entryId'), '20');
  assert.ok(!quotes[1].value.some(node => node.type === 'MD.link'));
  assert.deepEqual(inspectMessage([{ type: 'Markdown', value: quotes[1].value }]).commands, ['/储物袋 材料 草药']);
});

test('确认失败保留权威原因，不自动重试扣料', async t => {
  const { app, requests } = await gameFixture(t, () => ({ code: 'ALCHEMY_V2_VERSION_CHANGED', message: '炼丹规则已更新，请重新预览' }), 409);
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/炼丹 确认 stable-intent', platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  assert.equal(result.messages.length, 1);
  assert.match(result.messages[0].text, /炼丹规则已更新，请重新预览/);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});
test('拒绝不完整炼丹气泡', () => {
  assert.throws(() => parseAlchemyV2Reply({ ...reply, blocks: [{ text: '坏消息', quoted: true, inlineButtons: [{}] }] }));
  assert.throws(() => parseAlchemyV2Reply({ ...reply, blocks: [{ text: '等级：6', quoted: true, rows: [{ text: '等级：6', inlineButtons: [{}] }] }] }));
});

test('炼丹路由接收带确认参数的按钮命令', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, { ...reply, blocks: [], text: '原结果，未再次扣料。' }));
  const router = Router.create({ events: ['message.create', 'private.message.create'] });

  router.use('炼丹', async () => ({ default: handler }));
  await app.mount({ responseRouter: router.define });
  const result = await app.dispatch(app.events.privateMessage({ text: '/炼丹 确认 stable-intent', platform: 'qq-bot' }));

  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.messageText, '/炼丹 确认 stable-intent');
  assert.equal(result.messages.length, 1);
  assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
});

test('炼丹记录与指引选中对应标签，保留手动分页与返回洞府', async t => {
  const { app, requests } = await gameFixture(t, request => {
    const history = request.body.messageText === '/炼丹 记录 2';

    return businessEnvelope(request.bid, {
      title: '我的洞府 · 炼丹房',
      heading: '',
      text: '',
      blocks: history
        ? [{ text: '聚灵丹', quoted: true }]
        : [
            {
              text: '炼丹方式：在丹方中选择炉数查看所需材料，确认后即时完成。\n职业效果：丹火与丹炉共同决定成丹率，成丹率为55%～100%。\n经验来源：炼制获得职业经验，达到要求自动升级并解锁丹方。\n炼制次数：1145',
              quoted: true
            },
            {
              text: '丹火：青纹火\n丹炉：青纹鼎',
              quoted: true,
              rows: [
                { text: '丹火：青纹火', inlineButtons: [{ label: '详情', command: '/物品详情 青纹火' }] },
                { text: '丹炉：青纹鼎', inlineButtons: [{ label: '详情', command: '/物品详情 青纹鼎' }] }
              ]
            }
          ],
      ...(history ? { nav: { current: 2, total: 2, count: 6, command: '/炼丹 记录 {page}' } } : {}),
      buttons: [{ label: '返回洞府', command: '/我的洞府' }],
      advice: []
    });
  });
  for (const command of ['/炼丹 记录 2', '/炼丹 指引']) {
    const history = command.endsWith('2');
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.match(message.text, history ? /‹职业›\s*‹丹方›\s*‹▸记录›\s*‹指引›/ : /‹职业›\s*‹丹方›\s*‹记录›\s*‹▸指引›/);
    assert.match(message.text, history ? /聚灵丹[\s\S]*第2\/2页 · 共6条/ : /炼丹方式：在丹方中选择炉数/);
    for (const action of ['/炼丹', '/炼丹 丹方', '/炼丹 记录', '/炼丹 指引', '/我的洞府']) {
      assert.ok(message.commands.includes(action), action);
    }
    assert.equal(message.commands.includes('/炼丹 记录 1'), history);
    const nodes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
    const buttons = nodes.filter(node => node.type === 'MD.button');
    assert.ok(buttons.length);
    assert.ok(buttons.every(button => button.options?.autoEnter === false && !Object.hasOwn(button.options ?? {}, 'show')));
    if (!history) {
      assert.match(message.text, /职业效果：丹火与丹炉.*55%～100%/);
      assert.match(message.text, /炼制次数：1145/);
      const itemLinks = nodes.flatMap(node => node.type === 'MD.blockquote' ? node.value : []).filter(node => node.type === 'MD.button');
      assert.deepEqual(itemLinks.map(button => button.options?.data), ['/物品详情 青纹火', '/物品详情 青纹鼎']);
      assert.ok(itemLinks.every(button => button.options?.autoEnter === false && !Object.hasOwn(button.options ?? {}, 'show')));
    }
  }
  assert.equal(requests.length, 2);
});

test('炼丹首页显示等级经验、当前等级效果和天工', async t => {
  const homeButtons = [
    { label: '丹方', command: '/炼丹 丹方' },
    { label: '返回洞府', command: '/我的洞府' }
  ];
  const { app, requests } = await gameFixture(t, request =>
    businessEnvelope(request.bid, {
      title: '我的洞府 · 炼丹房',
      heading: '',
      text: '我的职业',
      blocks: [
        {
          text: '炼丹师\n等级：6\n经验：5010 / 4050',
          quoted: true,
          rows: [
            { text: '炼丹师', bold: true },
            { text: '等级：6' },
            { text: '经验：5010 / 4050' }
          ]
        },
        { text: '当前等级效果', quoted: false },
        { text: '已解锁丹方1张\n每批最多炼制1000炉', quoted: true },
        { text: '我的天工', quoted: false, inlineButtons: [{ label: '获取天工', command: '/炼丹 来源' }] },
        {
          text: '丹火：青纹火\n丹炉：青纹鼎',
          quoted: true,
          rows: [
            { text: '丹火：青纹火', inlineButtons: [{ label: '切换', command: '/炼丹 天工' }] },
            { text: '丹炉：青纹鼎', inlineButtons: [{ label: '切换', command: '/炼丹 天工' }] }
          ]
        }
      ],
      buttons: homeButtons,
      advice: []
    })
  );
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/炼丹', platform: 'qq-bot' }));
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const nodes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
  const quotes = nodes.filter(node => node.type === 'MD.blockquote');
  assert.equal(quotes.length, 3);
  assert.ok(Array.isArray(quotes[0].value));
  assert.deepEqual(quotes[0].value[0], { type: 'MD.bold', value: '炼丹师' });
  const text = inspectMessage([{ type: 'Markdown', value: [quotes[0]] }]).text;
  assert.match(message.text, /‹▸职业›\s*‹丹方›/);
  assert.match(message.text, /\n我的职业/);
  assert.match(text, /> 炼丹师\n/);
  assert.match(text, /等级：6\n> 经验：5010 \/ 4050/);
  assert.match(message.text, /\n当前等级效果\n\s*> 已解锁丹方1张\n> 每批最多炼制1000炉/);
  assert.match(message.text, /\n我的天工 ‹获取天工›/);
  const equipment = inspectMessage([{ type: 'Markdown', value: [quotes[2]] }]).text;
  assert.match(equipment, /丹火：青纹火 ‹切换›\n> 丹炉：青纹鼎 ‹切换›/);
  const footer = nodes.slice(nodes.indexOf(quotes[2]) + 1).filter(node => node.type === 'MD.button');
  assert.deepEqual(footer.map(node => node.options?.data), ['/我的洞府']);
  assert.ok(['/炼丹 天工', '/炼丹 来源'].every(action => message.commands.includes(action)));
  assert.ok(!message.commands.includes('/炼丹 进阶'));
  assert.ok(homeButtons.every(button => message.commands.includes(button.command)));
  assert.ok(!message.commands.includes('/炼丹 详情'));
  assert.equal(message.commands.filter(command => command === '/炼丹 丹方').length, 1);
  const buttons = nodes.filter(node => node.type === 'MD.button');
  assert.ok(buttons.length);
  assert.ok(buttons.every(button => button.options?.autoEnter === false && !Object.hasOwn(button.options ?? {}, 'show')));
  assert.equal(requests.length, 1);
});





test('确认通信异常保留原操作供恢复，不引导创建新炼制', async t => {
  const { app, requests } = await gameFixture(t, () => ({ code: 'INTERNAL', message: 'internal failure' }), 500);
  const command = '/炼丹 确认 r1_1_a_m1234567_0123456789abcdef01234567';
  const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
  assert.equal(requests.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  assert.match(message.text, /结果暂未确认/);
  assert.ok(message.commands.includes(command));
  assert.ok(!message.commands.includes('/炼丹'));
});

test('炼丹确认通信异常不会把自由文本写进重试按钮', async t => {
  const { app } = await gameFixture(t, () => ({ code: 'INTERNAL', message: 'internal failure' }), 500);
  const result = await app.runHandler(handler, app.events.privateMessage({ text: '/炼丹 确认 回显占位词', platform: 'qq-bot' }));
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  assert.doesNotMatch(message.text, /回显占位词/);
  assert.ok(message.commands.every(command => !command.includes('回显占位词')));
});

test('炼丹旧版 b3 凭据只在完整的 80 字符指令下生成重试按钮', async t => {
  const { app } = await gameFixture(t, () => ({ code: 'INTERNAL', message: 'internal failure' }), 500);
  const raw = Buffer.alloc(52);
  raw.set([3, 1]);
  for (const offset of [2, 10, 18]) raw.writeBigUInt64BE(1n, offset);
  raw.writeUInt16BE(1000, 26);
  raw.fill(0xab, 28);
  const full = `/炼丹 确认 b3.${raw.toString('base64url')}`;
  assert.equal([...full].length, 80);
  for (const command of [full, full.slice(0, -1)]) {
    const result = await app.runHandler(handler, app.events.privateMessage({ text: command, platform: 'qq-bot' }));
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    assert.equal(message.commands.includes(command), command === full);
  }
});

test('天工操作续接原丹方和炉数，且不串玩家导航', async t => {
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
    ...reply, text: '已装备青纹鼎', blocks: [], buttons: [{ label: '丹方', command: '/炼丹 丹方' }]
  }));
  const run = (text: string, userId: string) => app.runHandler(handler, app.events.privateMessage({ text, userId, platform: 'qq-bot' }));
  await run('/炼丹 预览 7 100', 'continuation-owner');
  const owner = await run('/炼丹 装备 9', 'continuation-owner');
  assert.ok(owner.messages[0].commands.includes('/炼丹 预览 7 100'));
  assert.equal(owner.actions[owner.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  const other = await run('/炼丹 天工', 'continuation-other');
  assert.ok(!other.messages[0].commands.includes('/炼丹 预览 7 100'));
});

test('炼丹结算只上报实际炼制，原回执重放不会重复上报', async t => {
  const actions: Array<Record<string, unknown>> = [];
  const fetchBackend = globalThis.fetch;

  t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    if (!String(input).startsWith('https://analytics.invalid/')) {
      return fetchBackend(input, init);
    }
    const { events } = JSON.parse(String(init?.body));
    if (String(input).includes('/actions')) {
      actions.push(...events);
    }
    return Response.json({ code: 0, data: { received: events.length } });
  });
  let replayed = false;
  const { app } = await gameFixture(t, request => businessEnvelope(request.bid, {
    ...reply,
    alchemySettlement: { count: 3, successCount: 2, failedCount: 1, exp: 5, replayed }
  }), 200, {
    analytics_api_url: 'https://analytics.invalid',
    analytics_api_key: 'offline-analytics-key'
  });
  for (const replay of [false, true]) {
    replayed = replay;
    const event = app.events.privateMessage({ text: '/炼丹 确认 stable-intent', platform: 'qq-bot' });

    Object.assign(event, { BotId: '100017' });
    const result = await app.runHandler(handler, event);
    assert.deepEqual(result.errors, []);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok);
  }
  mock.timers.tick(8000);
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(actions.length, 1);
  assert.equal(actions[0].action, 'alchemy');
  assert.equal(actions[0].result, 'success');
  assert.deepEqual(JSON.parse(String(actions[0].detail)), { count: 3, successCount: 2, failedCount: 1, exp: 5 });
});
