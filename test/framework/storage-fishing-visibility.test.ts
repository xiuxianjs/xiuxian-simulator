import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { after, before, mock, test } from 'node:test';
import { createResult, onResponse, ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import { createGameRouter } from '../../src/router';
import { parseFishingCommand } from '../../src/response/fishing/commands';
import menu from '../../src/response/storage/newBag/main/res';
import { startFeatureVisibility } from '../../src/utils/featureVisibility';
import { businessEnvelope, gameFixture } from './fixture';

before(() => mock.timers.enable({ apis: ['setTimeout'] }));
after(async () => { mock.timers.reset(); await shutdownLogger(); });

// Match the GET /content/tianshu wire shape. Startup commands are static;
// the current-player access response can already come from the updated server.
const fishCommand = '/储物袋 渔获';
const catalogue = (fixed: boolean, canonical: boolean) => ({
  gateVersion: 1, intro: '功能门槛目录', realmUnlocks: [], notes: [],
  commandFeatures: { 储物袋: 'inventory', 物品详情: 'inventory', 我: 'profile', 属性面板: 'profile', 查看主线: 'profile', 我的活动: 'activities', 商店: 'shop',
    ...(fixed ? { 垂钓: 'fishing', 渔获: 'fishing', 钓具: 'fishing', 渔市: 'fishing' } : {}),
    ...(canonical ? { '储物袋 渔获': 'fishing', '物品详情 渔获': 'fishing', '锁定 渔获': 'fishing', '解锁 渔获': 'fishing', '出售 渔获': 'fishing' } : {}) },
  featureCatalog: [{ stageLevel: 0, stageName: '通用',
    features: ['inventory', 'profile', 'activities', 'shop', ...(fixed ? ['fishing'] : [])].map(id => ({
      id, name: id, description: '', realm: '无境界限制', realmReached: true, visible: true, conditions: []
    })) }]
});

for (const [catalogueName, fixed, canonical] of [
  ['未登记钓鱼', false, false], ['旧钓鱼别名', true, false], ['储物袋新别名', true, true]
] as const) for (const state of ['炼气八层未开塘', '高境界已开塘']) {
  test(`储物袋真实功能过滤：${catalogueName}，${state}`, async t => {
    const { app, requests } = await gameFixture(t, request => {
      if (request.path === '/api/v1/content/tianshu') { return catalogue(fixed, canonical); }
      if (request.path === '/api/v1/content/tianshu?view=access') {
        return { gateVersion: 1, features: { inventory: true, profile: true, activities: true, shop: true,
          fishing: true, 'fishing-build': state === '高境界已开塘' } };
      }
      assert.ok(request.path.endsWith('/storage.menu'));
      return businessEnvelope(request.bid, { message: '' });
    });
    await app.invoke(app.events.privateMessage({ platform: 'qq-bot' }), startFeatureVisibility);

    let sent!: () => void;
    const delivered = new Promise<void>(resolve => { sent = resolve; });
    app.actions.on('message.send', () => {
      sent();
      return [createResult(ResultCode.Ok, 'Offline delivery', { id: 'bag-capture' })];
    });
    // The real legacy handler uses void send. Keep this test execution alive
    // until its real asynchronous filter/HTTP/send finishes; do not mock policy.
    const capture = onResponse(menu.select, async event => {
      assert.equal(typeof menu.current, 'function');
      if (typeof menu.current !== 'function') { throw new Error('Storage handler shape changed'); }
      await menu.current(event);
      await delivered;
    });
    const result = await app.runHandler(capture, app.events.privateMessage({ text: '/储物袋', platform: 'qq-bot' }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const view = inspectMessage(message.nodes);
    const firstRow = ['/储物袋 道具 丹药', '/储物袋 材料 草药', '/储物袋 装备'];
    assert.deepEqual(view.commands.slice(0, fixed ? 4 : 3), fixed ? [...firstRow, fishCommand] : firstRow);
    assert.equal(view.commands.includes(fishCommand), fixed);
    t.diagnostic(`实际首排：道具／材料／装备${fixed ? '／渔获' : ''}；${state}；个人access已包含fishing:true。`);
    for (const command of ['/储物袋 天工', '/储物袋 功法', '/储物袋 本命', '/储物袋 礼盒', '/我']) {
      assert.ok(view.commands.includes(command));
    }
    const markdown = message.nodes.find(node => node.type === 'Markdown');
    assert.ok(markdown && Array.isArray(markdown.value));
    const fish = markdown.value.find(node => node.type === 'MD.button' && node.options?.data === fishCommand);
    if (fixed) {
      assert.ok(fish && fish.type === 'MD.button');
      assert.equal(fish.options?.autoEnter, false);
      assert.ok(!Object.hasOwn(fish.options ?? {}, 'show'));
      assert.ok([...fish.options!.data!].length <= 80);
    } else { assert.equal(fish, undefined); }
    if (process.env.FISHING_STORAGE_PREVIEW_OUTPUT && canonical && state === '高境界已开塘') {
      writeFileSync(`${process.env.FISHING_STORAGE_PREVIEW_OUTPUT}-bag.json`, JSON.stringify(message, null, 2));
    }
    assert.equal(requests.filter(request => request.path === '/api/v1/content/tianshu').length, 1);
    assert.equal(requests.filter(request => request.path.includes('view=access')).length, 1);
    assert.equal(requests.filter(request => request.path.endsWith('/storage.menu')).length, 1);
    assert.ok(!requests.some(request => /fishing|catches|pond/.test(request.path)));
  });
}

test('总路由将储物袋渔获和旧链接送入原鱼种库存，和本次记录分开', async t => {
  const { app, requests } = await gameFixture(t, request => {
    if (request.path === '/api/v1/content/tianshu') { return catalogue(true, true); }
    if (request.path === '/api/v1/content/tianshu?view=access') {
      return { gateVersion: 1, features: { inventory: true, profile: true, activities: true, shop: true, fishing: true } };
    }
    assert.ok(request.path.endsWith('/fishing.query'));
    const { view, page } = request.body.arguments as { view: string; page: number };

    return businessEnvelope(request.bid, {
      rulesVersion: 'fishing-inventory-route-test', view,
      title: view === 'species' ? '储物袋 · 渔获鱼种' : '垂钓 · 本次渔获记录',
      sections: [{ title: '', lines: ['状态：暂无记录。'] }], footer: [],
      ...(view === 'species' && page === 1 ? { nav: { page: 1, totalPages: 2, total: 6, command: `${fishCommand} {page}` } } : {})
    });
  });
  const routes = app.run(createGameRouter);

  await app.mount({ responseRouter: routes.router });
  assert.equal(routes.matchesGameCommand({ name: 'private.message.create', MessageText: '/储物袋' }), true);
  const inputs = [
    [fishCommand, { view: 'species', page: 1 }],
    [`${fishCommand} 2`, { view: 'species', page: 2 }],
    ['储物袋 渔获 2147483647', { view: 'species', page: 2147483647 }],
    ['/垂钓 渔获 3', { view: 'species', page: 3 }],
    ['/渔获', { view: 'species', page: 1 }],
    ['渔获 4', { view: 'species', page: 4 }],
    ['/垂钓 渔获记录', { view: 'history', sku: 'fish', page: 1 }]
  ] as const;

  for (const [text, expected] of inputs) {
    const result = await app.dispatch(app.events.privateMessage({ text, platform: 'qq-bot' }));
    const calls = requests.filter(request => request.path.endsWith('/fishing.query'));

    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1, text);
    assert.equal(result.actions[result.messages[0].actionIndex].results?.[0].code, ResultCode.Ok, text);
    assert.deepEqual(calls.at(-1)?.body.arguments, expected, text);
    if (text === fishCommand) {
      assert.ok(inspectMessage(result.messages[0].nodes).commands.includes(`${fishCommand} 2`));
      if (process.env.FISHING_STORAGE_PREVIEW_OUTPUT) {
        writeFileSync(`${process.env.FISHING_STORAGE_PREVIEW_OUTPUT}-inventory.json`, JSON.stringify(result.messages[0], null, 2));
      }
    }
  }
  assert.equal(requests.filter(request => request.path.endsWith('/fishing.query')).length, inputs.length);
  const invalid = await app.dispatch(app.events.privateMessage({ text: `${fishCommand} 0`, platform: 'qq-bot' }));

  assert.deepEqual(invalid.errors, []);
  assert.match(inspectMessage(invalid.messages[0].nodes).text, /储物袋 渔获 \[页码\]/);
  assert.equal(requests.filter(request => request.path.endsWith('/fishing.query')).length, inputs.length);
});

test('储物袋渔获沿装备命令查看鱼种、原单尾和预览操作', async t => {
  const catchId = 'ff_' + 'a'.repeat(32);
  const speciesId = 'fishing_r0_a';
  const sellSpeciesCommand = '/出售 渔获 银纹小鲫 全部';
  const detailCommand = `/物品详情 渔获 ${catchId} 2 3 凡物`;
  const instancesCommand = `/储物袋 渔获 ${speciesId} 2 3 凡物`;
  const lockedId = 'ff_' + 'c'.repeat(32);
  const listedId = 'ff_' + 'd'.repeat(32);
  const instanceRows = [
    { id: catchId, lines: ['重量：0.178 kg'], actions: [
      { label: '出售', command: `/出售 渔获 ${catchId}` }, { label: '锁定', command: `/锁定 渔获 ${catchId}` }, { label: '详情', command: detailCommand }
    ] },
    { id: lockedId, lines: ['重量：0.150 kg'], actions: [
      { label: '解锁', command: `/解锁 渔获 ${lockedId}` }, { label: '详情', command: `/物品详情 渔获 ${lockedId} 2 3 凡物` }
    ] },
    { id: listedId, lines: ['重量：0.128 kg', '状态：交易中'], actions: [
      { label: '详情', command: `/物品详情 渔获 ${listedId} 2 3 凡物` }
    ] }
  ];
  const confirmRef = 'r1_1_y_abc_' + '1'.repeat(24);
  const operationId = 'fo_' + 'b'.repeat(32);
  const tabs = ['全部', '凡物', '炼气', '筑基', '金丹', '元婴', '化神', '洞虚', '合体', '大乘', '仙', '素材']
    .map(label => ({ label, command: `/储物袋 渔获 ${label}` }));
  const { app, requests } = await gameFixture(t, request => {
    // Use an older but already fishing-enabled directory to exercise the new
    // typed links without relying on the new exact server aliases being loaded.
    if (request.path === '/api/v1/content/tianshu') { return catalogue(true, false); }
    if (request.path === '/api/v1/content/tianshu?view=access') {
      return { gateVersion: 1, features: { inventory: true, profile: true, activities: true, shop: true, fishing: true } };
    }
    const base = { rulesVersion: 'fishing-storage-facts-fixture', sections: [], footer: [] };

    if (request.path.endsWith('/fishing.preview')) {
      return businessEnvelope(request.bid, {
        ...base, view: 'preview', title: '渔获操作 · 确认', operationId: 'original-fish-operation',
        confirmationRef: confirmRef, expiresAt: '2026-11-05T12:05:00Z',
        sections: [{ title: '原渔获', lines: ['预览有效5分钟。'] }]
      });
    }
    if (request.path.endsWith('/fishing.confirm')) {
      return businessEnvelope(request.bid, { ...base, view: 'receipt', title: '渔获操作 · 已完成' });
    }
    assert.ok(request.path.endsWith('/fishing.query'));
    const { view, speciesName } = request.body.arguments as { view: string; speciesName?: string };

    if (view === 'species') {
      return businessEnvelope(request.bid, {
        ...base, view, title: '储物袋 · 渔获', status: '凡物', navRows: [tabs.slice(0, 6), tabs.slice(6)],
        sections: [{ title: '银纹小鲫', id: speciesId, lines: ['数量：7尾'], actions: [{ label: '查看该种', command: instancesCommand }, { label: '一键出售', command: sellSpeciesCommand }] }],
        nav: { page: 1, totalPages: 1, total: 1, command: '/储物袋 渔获 凡物 {page}' },
        footer: [{ label: '按境界出售', command: '/出售 渔获 境界' }, { label: '鱼谱', command: '/垂钓 鱼谱 1' }]
      });
    }
    if (view === 'bag-materials') {
      return businessEnvelope(request.bid, {
        ...base, view, title: '储物袋 · 渔获素材', status: '素材', navRows: [tabs.slice(0, 6), tabs.slice(6)],
        sections: [{ title: '水灵砂', id: '1234', lines: ['数量：×2 · 品级：一品 · 境界：炼气', '单价：5灵鳞钱'], actions: [
          { label: '出售', command: '/垂钓 回收材料 水灵砂 1' }, { label: '详情', command: '/物品详情 材料 5012' }
        ] }],
        footer: [{ label: '返回储物袋', command: '/储物袋' }]
      });
    }
    if (view === 'instances') {
      return businessEnvelope(request.bid, {
        ...base, view, title: '银纹小鲫 · 凡物',
        sections: instanceRows.map(row => ({ title: '银纹小鲫', ...row })),
        footer: [{ label: '返回', command: '/储物袋 渔获 凡物 3' }, { label: '按重量区间出售', command: '/出售 渔获 银纹小鲫' }]
      });
    }
    if (view === 'fish') {
      return businessEnvelope(request.bid, {
        ...base, view, title: '物品详情',
        sections: [{ title: '银纹小鲫', id: catchId, lines: ['境界：凡物', '重量：0.178 kg', '售价：1灵鳞钱'] }],
        footer: [{ label: '返回', command: instancesCommand }]
      });
    }
    if (view === 'operation') {
      return businessEnvelope(request.bid, {
        ...base, view: 'sale-receipt', title: '出售渔获 · 已完成',
        sections: [{ title: '原出售清单', lines: ['数量：9尾'] }],
        nav: { page: 1, totalPages: 2, total: 9, command: `/垂钓 操作 ${operationId} {page}` }
      });
    }

    if (view === 'sell-realm') {
      return businessEnvelope(request.bid, {
        ...base, view, title: '鱼类出售 · 按境界', sections: [{
          title: '凡物', lines: ['可出售：2尾'], actions: [{ label: '预览出售', command: '/出售 渔获 境界 凡物' }]
        }], footer: [{ label: '返回渔获', command: '/储物袋 渔获' }]
      });
    }
    assert.equal(view, 'sell-range');

    return businessEnvelope(request.bid, {
      ...base, view, title: '鱼类出售 · 重量区间', emphasisNames: speciesName ? [speciesName] : [],
      sections: [{
        lines: [...(speciesName ? [`限定鱼种：${speciesName}`] : []), '请输入最低和最高重量，单位kg，最多3位小数。'],
        actions: [{ label: '填写重量区间', command: speciesName ? `/出售 渔获 ${speciesName} 0.080 0.450` : '/出售 渔获 全部 0.080 18000.000' }]
      }]
    });
  });
  const routes = app.run(createGameRouter);

  await app.mount({ responseRouter: routes.router });
  const open = async (text: string) => {
    const result = await app.dispatch(app.events.privateMessage({ text, platform: 'qq-bot' }));

    assert.deepEqual(result.errors, []);
    assert.equal(result.messages.length, 1, text);
    const message = result.messages[0];

    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok, text);
    const bar = message.nodes.find(node => node.type === 'BT.group');

    assert.ok(bar?.type === 'BT.group', text);
    assert.deepEqual(bar.value.map(row => row.value.map(button => button.value)), [['我', '战', '本', '动', '店']], text);

    return { ...inspectMessage(message.nodes), nodes: message.nodes };
  };
  const inventory = await open('/储物袋 渔获 凡物 3');

  assert.deepEqual(inventory.commands.slice(0, 12), tabs.map(tab => tab.command));
  assert.ok(inventory.commands.includes(instancesCommand));
  assert.ok(inventory.commands.includes(sellSpeciesCommand));
  const markdown = inventory.nodes.find(node => node.type === 'Markdown');

  assert.ok(markdown && Array.isArray(markdown.value));
  const firstTabs = markdown.value.filter(node => node.type === 'MD.button').slice(0, 12);

  assert.deepEqual(firstTabs.map(node => node.options?.autoEnter), Array(12).fill(false));
  assert.ok(firstTabs.every(node => !Object.hasOwn(node.options ?? {}, 'show')));
  assert.equal(firstTabs[1].value, '‹▸凡物›');
  assert.ok(markdown.value.findIndex(node => node.type === 'MD.button') < markdown.value.findIndex(node => node.type === 'MD.blockquote'));
  assert.match(inventory.text, /第1\/1页 · 共1条/);
  assert.deepEqual(markdown.value.filter(node => node.type === 'MD.button').slice(12).map(node => [node.value, node.options?.data, node.options?.autoEnter]), [
    ['‹按境界出售›', '/出售 渔获 境界', false], ['‹鱼谱›', '/垂钓 鱼谱 1', false]
  ]);

  const materials = await open(inventory.commands[11]);

  assert.deepEqual(materials.commands.slice(0, 12), tabs.map(tab => tab.command));
  assert.match(materials.text, /‹▸素材›/);
  assert.match(materials.text, /数量：×2 · 品级：一品 · 境界：炼气/);
  assert.ok(materials.commands.includes('/垂钓 回收材料 水灵砂 1'));
  assert.ok(materials.commands.includes('/物品详情 材料 5012'));
  assert.ok(materials.nodes.some(node => node.type === 'Markdown' && node.value.some(block => block.type === 'MD.blockquote' && Array.isArray(block.value) && block.value.some(heading => heading.type === 'MD.bold' && heading.value === '水灵砂 #1234'))));
  assert.ok(materials.nodes.some(node => node.type === 'Markdown' && node.value.some(button => button.type === 'MD.button' && button.value === '‹返回›' && button.options?.data === '/储物袋 渔获')));
  const instances = await open(instancesCommand);
  const instanceMarkdown = instances.nodes.find(node => node.type === 'Markdown');

  assert.ok(instanceMarkdown?.type === 'Markdown');
  const instanceQuotes = instanceMarkdown.value.filter(node => node.type === 'MD.blockquote');

  assert.equal(instanceQuotes.length, instanceRows.length);
  for (const [index, row] of instanceRows.entries()) {
    const quote = instanceQuotes[index];

    assert.ok(!instances.text.includes(row.id));
    assert.ok(Array.isArray(quote.value));
    assert.deepEqual(quote.value.filter(node => node.type === 'MD.bold').map(node => node.value), ['银纹小鲫']);
    assert.deepEqual(quote.value.filter(node => node.type === 'MD.text').map(node => node.value).filter(text => text.trim()), row.lines);
    assert.deepEqual(quote.value.filter(node => node.type === 'MD.button').map(node => [node.value, node.options?.data, node.options?.autoEnter]),
      row.actions.map(action => [`‹${action.label}›`, action.command, false]));
  }
  assert.ok(instances.commands.includes('/储物袋 渔获 凡物 3'));
  assert.ok(instances.commands.includes('/出售 渔获 银纹小鲫'));
  assert.ok((await open('储物袋 渔获 银纹小鲫 2 3 凡物')).commands.includes(detailCommand));
  const fish = await open(detailCommand);

  assert.deepEqual(fish.commands.slice(0, -5), [instancesCommand]);
  assert.ok(fish.text.includes(catchId));
  assert.ok((await open(`/锁定 渔获 ${catchId}`)).commands.includes(`/垂钓 确认 ${confirmRef}`));
  await open(`/垂钓 确认 ${confirmRef}`);
  await open(`解锁 渔获 ${catchId}`);
  await open(`/出售 渔获 ${catchId}`);
  const oneClick = await open(sellSpeciesCommand);
  assert.ok(oneClick.commands.includes(`/垂钓 确认 ${confirmRef}`));
  const realmCommand = inventory.commands.find(command => command === '/出售 渔获 境界');

  assert.ok(realmCommand);
  const realmGuide = await open(realmCommand);
  const selectedRealmCommand = realmGuide.commands.find(command => command === '/出售 渔获 境界 凡物');

  assert.ok(selectedRealmCommand);
  const realmMarkdown = realmGuide.nodes.find(node => node.type === 'Markdown');

  assert.ok(realmMarkdown?.type === 'Markdown');
  const realmCard = realmMarkdown.value.find(node => node.type === 'MD.blockquote');

  assert.ok(realmCard?.type === 'MD.blockquote' && Array.isArray(realmCard.value));
  assert.ok(realmCard.value.some(node => node.type === 'MD.bold' && node.value === '凡物'));
  assert.ok(realmCard.value.some(node => node.type === 'MD.button' && node.options?.data === selectedRealmCommand && node.options?.autoEnter === false));
  assert.ok((await open(selectedRealmCommand)).commands.includes(`/垂钓 确认 ${confirmRef}`));
  const allGuide = await open('/出售 渔获');
  const speciesGuide = await open('/出售 渔获 银纹小鲫');

  assert.deepEqual(allGuide.commands.slice(0, -5), ['/出售 渔获 全部 0.080 18000.000']);
  assert.deepEqual(speciesGuide.commands.slice(0, -5), ['/出售 渔获 银纹小鲫 0.080 0.450']);
  const guideMarkdown = speciesGuide.nodes.find(node => node.type === 'Markdown');

  assert.ok(guideMarkdown?.type === 'Markdown');
  assert.ok(guideMarkdown.value.some(node => node.type === 'MD.bold' && node.value === '银纹小鲫'));
  assert.ok(guideMarkdown.value.some(node => node.type === 'MD.button' && node.value === '‹填写重量区间›' && node.options?.autoEnter === false));
  await open('/出售 渔获 银纹小鲫 0.001 1.234');
  await open('/出售 渔获 全部 0 1.234');
  assert.ok((await open(`/垂钓 操作 ${operationId}`)).commands.includes(`/垂钓 操作 ${operationId} 2`));
  await open(`/垂钓 操作 ${operationId} 2`);
  assert.deepEqual(requests.filter(request => request.path.includes('/api/v2/robot/business/')).map(request => request.body.arguments), [
    { view: 'species', page: 3, fishRealm: 0 },
    { view: 'bag-materials' },
    { view: 'instances', speciesId, page: 2, returnPage: 3, fishRealm: 0 },
    { view: 'instances', speciesName: '银纹小鲫', page: 2, returnPage: 3, fishRealm: 0 },
    { view: 'fish', catchId, page: 2, returnPage: 3, fishRealm: 0 },
    { kind: 'fish-lock', catchId, lock: true }, { ref: confirmRef }, { kind: 'fish-lock', catchId, lock: false },
    { kind: 'sell-fish', fishIds: [catchId], preserveUpgrade: false },
    { kind: 'sell-fish', speciesName: '银纹小鲫' },
    { view: 'sell-realm' }, { kind: 'sell-fish', fishRealm: 0 },
    { view: 'sell-range' }, { view: 'sell-range', speciesName: '银纹小鲫' },
    { kind: 'sell-fish-range', speciesName: '银纹小鲫', minWeightG: 1, maxWeightG: 1234 },
    { kind: 'sell-fish-range', minWeightG: 0, maxWeightG: 1234 },
    { view: 'operation', operationId }, { view: 'operation', operationId, page: 2 }
  ]);
  for (const command of [`/物品详情 渔获 ${catchId.slice(0, -1)}`, '/锁定 渔获 2', '/出售 渔获 银纹小鲫 1.2', '/出售 渔获 全部 2 1', '/出售 渔获 全部 全部', '/出售 渔获 境界 全部', '/出售 渔获 境界 炼气 1']) {
    const rejected = await open(command);

    assert.ok(rejected.commands.includes(fishCommand));
  }
  assert.equal(requests.filter(request => request.path.includes('/api/v2/robot/business/')).length, 18);
  assert.deepEqual(parseFishingCommand('/出售 渔获 境界 2'), { operation: 'fishing.query', input: { view: 'sell-realm', page: 2 } });
  assert.deepEqual(parseFishingCommand('/出售 渔获 境界 仙'), { operation: 'fishing.preview', input: { kind: 'sell-fish', fishRealm: 9 } });
  assert.equal(parseFishingCommand('/物品详情 装备 42'), undefined);
  assert.equal(parseFishingCommand('/锁定 装备 42'), undefined);
});
