import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { after, test, type TestContext } from 'node:test';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage, type TestRunResult } from 'alemonjs/testing';
import recharge from '../../src/response/recharge/info/res';
import rights from '../../src/response/monthCard/rights/res';
import treasures from '../../src/response/treasures/res';
import { createBackendRequestContext } from '../../src/api/bot/context';
import { businessEnvelope, type BusinessRequest } from './fixture';

after(async () => { await shutdownLogger(); });

const catalog = {
  showNewcomerRebate: false, showWeeklyRebate: false,
  catalog: {
    packages: [], rewardNames: { items: {}, equipments: {}, skills: {} }, activityPackages: [],
    sponsor: { totalYuan: 0, thresholdYuan: 100, remainingYuan: 100, hasThemePermission: false },
    benefitView: { sponsorIntro: '赞助说明', monthCardPrivilegeLines: ['月卡说明'], seclusionPassPrivilegeLines: ['金手指说明'], seclusionPassFallbackLine: '暂未开放' }
  }
};
const lease = { active: false, canPurchase: true, startDate: null, endDate: null, remainingDays: 0, claimableDays: 0, claimableCrystal: 0, maxDays: 180, packageId: 99, priceAmount: 3000, dailyCrystal: 2000, immediateDaoCrystal: 300 };
const packs = { serverDate: '2026-10-29', unresolvedOrderNo: null, quotas: [], products: [{
  sku: 'small', name: '1元礼包', packageId: 31, priceAmount: 100, basePriceAmount: 100, creditedAmount: 0, canClaimFree: false,
  limit: 3, remaining: 3, available: true, unavailableReason: '', label: '超值300%', promotionTexts: [],
  rewardParts: [{ kind: 'dao_crystal', name: '道晶', quantity: 10 }, { kind: 'spirit_crystal', name: '灵晶', quantity: 1500 }]
}] };
const membership = {
  name: '道友', vipLevel: 2, totalRechargeAmount: 3000, nextVipLevel: 3, nextVipThreshold: 6000, firstRechargeTime: null,
  activeThemeConfig: null, canUseMeridian: true, canUseSoulPath: false, progressText: '距VIP3还需30元',
  monthCardInstantRewards: [], seclusionPriceText: '金手指说明', seclusionRewards: [],
  monthCard: {
    active: true, expireTime: '2026-11-20T23:59:59+08:00', remainingDays: 23, totalDays: 30, maxDays: 90, remainingQuota: 60, package: null,
    daily: { total: 30, claimableCount: 1, claimedCount: 6, upcomingCount: 23, calendarState: [] }
  },
  seclusionPass: { active: false, expireTime: null, remainingDays: 0, totalDays: 0, maxDays: 90, package: null }
};
const relics = {
  serverDate: '2026-10-29', balances: { spiritCrystal: 0, daoCrystal: 0, treasureMaps: 0 }, freeAvailable: true,
  spiritTenDiscountAvailable: true, totalExplorations: 300, milestoneProgress: 0, pendingSelections: 1,
  shapeRates: { singleComplete: .12, tenExpectedComplete: 1.478500976009402, tenAverageComplete: .1478500976009402 },
  pity: [], wholeRates: [], rules: [], records: []
};
const attributes = { physicalAttack: 0, magicAttack: 0, physicalDefense: 0, magicDefense: 0, hp: 0 };
const overview = {
  experience: 0, xianYun: 0, levelCap: 10, version: 1, decompositionValues: [], records: [],
  fortune: { score: 0, level: 0, maxLevel: 20, nextThreshold: 1, bonus: { critRate: 0, hitRate: 0, dodgeRate: 0, critDamage: 0 } },
  items: ['九天息壤', '玉净瓶', '乾坤鼎', '掌天瓶'].map((name, index) => ({
    definition: { id: 601 + index, name, rarity: 6, rarityName: '神话', baseAttributes: attributes, perLevelAttributes: attributes,
      basePercentAttributes: attributes, effectDescription: '生活效果', stageValues: ['5%', '10%', '15%', '20%'], maxGrade: 24, weight: 1 },
    owned: false, grade: 0, gradeName: '', level: 0, fragments: 0, duplicates: 0, attributes, percentAttributes: attributes,
    currentEffect: '', nextLevelCost: 0, promotion: null, canUpgrade: false, canPromote: false
  }))
};
const operationData: Record<string, unknown> = {
  'recharge.catalog': catalog, 'spirit-vein.overview': lease, 'treasures.daily-packs': packs,
  'membership.rights': membership, 'ancient-relics.overview': relics, 'treasures.overview': overview
};

// The real robot endpoints share one idempotency scope. Replaying the same key
// and fingerprint returns its saved response; changing the path/body is a 409.
async function replayFixture(t: TestContext) {
  const requests: BusinessRequest[] = [];
  const ledger = new Map<string, { fingerprint: string; data: unknown }>();
  let conflicts = 0;
  const server = createServer(async (req, res) => {
    try {
      req.setEncoding('utf8');
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const path = req.url ?? '';
      const bid = String(req.headers['x-bid'] ?? '');
      const idempotencyKey = String(req.headers['idempotency-key'] ?? '');
      requests.push({ path, bid, idempotencyKey, body: JSON.parse(raw || '{}') });
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'GET') {
        const data = path.endsWith('/recharge/first') ? { names: { items: {}, equipments: {}, skills: {} }, tiers: [] } : { empty: true, milestones: [] };
        res.end(JSON.stringify({ data }));
        return;
      }
      const key = JSON.stringify([bid, idempotencyKey]);
      const fingerprint = JSON.stringify([req.method, path, raw]);
      const saved = ledger.get(key);
      if (saved && saved.fingerprint !== fingerprint) {
        conflicts++;
        res.statusCode = 409;
        res.end(JSON.stringify({ error: { code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency-Key 已用于其他请求' } }));
        return;
      }
      const operation = path.slice(path.lastIndexOf('/') + 1);
      assert.ok(Object.hasOwn(operationData, operation), `未预期的业务请求 ${path}`);
      const data = saved?.data ?? businessEnvelope(bid, operationData[operation]);
      ledger.set(key, { fingerprint, data });
      res.end(JSON.stringify({ data }));
    } catch {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: { code: 'FIXTURE_FAILED', message: '模拟请求处理失败' } }));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const app = createTestApp({ config: {
    processor: { repeated_user_time: 0 },
    'xiuxian-game': { backend: { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'offline-fixture-token' } }
  } });
  t.after(async () => {
    try { await app.dispose(); } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
  return { app, requests, ledger, conflicts: () => conflicts };
}

function sent(result: TestRunResult) {
  assert.deepEqual(result.errors, []);
  assert.equal(result.messages.length, 1);
  const message = result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
  const walk = (nodes: unknown[]) => {
    for (const value of nodes) {
      const node = value as { type?: string; options?: Record<string, unknown>; value?: unknown };
      if (node.type === 'MD.button') { assert.equal(node.options?.autoEnter, false); assert.ok(!Object.hasOwn(node.options ?? {}, 'show')); }
      if (Array.isArray(node.value)) walk(node.value);
    }
  };
  walk(message.nodes);
  return inspectMessage(message.nodes);
}

for (const [handler, command, privateChat, firstOperation, operation, expected, purchase] of [
  [recharge, '/充值 日礼包', true, 'recharge.catalog', 'treasures.daily-packs', /1元礼包 · ¥1.00/, '/充值购买 31'],
  [recharge, '/充值 灵脉租契', true, 'recharge.catalog', 'spirit-vein.overview', /灵脉租契 · ¥30.00/, '/充值购买 99'],
  [recharge, '/充值 灵脉租契', false, 'recharge.catalog', 'spirit-vein.overview', /灵脉租契 · ¥30.00/, '/充值购买 99'],
  [rights, '/我的权益', true, 'membership.rights', 'spirit-vein.overview', /灵脉租契 · 未开通/, '/我的权益 灵脉租契'],
  [rights, '/我的权益', false, 'membership.rights', 'spirit-vein.overview', /灵脉租契 · 未开通/, '/我的权益 灵脉租契'],
  [treasures, '/上古遗珍 自选', true, 'ancient-relics.overview', 'treasures.overview', /601 九天息壤 · 未拥有/, '/上古遗珍 自选 601'],
  [treasures, '/上古遗珍 自选', false, 'ancient-relics.overview', 'treasures.overview', /601 九天息壤 · 未拥有/, '/上古遗珍 自选 601']
] as const) {
  test(`${command}（${privateChat ? '私聊' : '群聊'}）二次查询独立幂等，原消息重投稳定，新消息不冲突`, async t => {
    const { app, requests, ledger, conflicts } = await replayFixture(t);
    const event = privateChat ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    for (let attempt = 0; attempt < 2; attempt++) {
      const view = sent(await app.runHandler(handler, event));
      assert.match(view.text, expected);
      assert.doesNotMatch(view.text, /操作未完成|Idempotency-Key|读取充值信息失败/);
      assert.ok(view.commands.includes(purchase));
      assert.deepEqual(requests.filter(request => request.path.includes('/robot/business/')).slice(attempt * 2, attempt * 2 + 2).map(request => request.path), [
        `/api/v2/robot/business/${firstOperation}`, `/api/v2/robot/business/${operation}`
      ]);
    }
    const businessRequests = () => requests.filter(request => request.path.includes('/robot/business/'));
    const firstKeys = businessRequests().slice(0, 2).map(request => request.idempotencyKey);
    assert.ok(firstKeys.every(Boolean));
    assert.equal(firstKeys[0], createBackendRequestContext(event).idempotencyKey, '首次请求保留原幂等键，兼容已保存的回执');
    assert.notEqual(firstKeys[0], firstKeys[1]);
    assert.deepEqual(businessRequests().slice(2, 4).map(request => request.idempotencyKey), firstKeys);
    assert.equal(ledger.size, 2);
    const next = privateChat ? app.events.privateMessage({ text: command, platform: 'qq-bot' }) : app.events.groupMessage({ text: command, platform: 'qq-bot' });
    assert.notEqual(next.MessageId, event.MessageId);
    assert.match(sent(await app.runHandler(handler, next)).text, expected);
    assert.equal(new Set(businessRequests().map(request => request.idempotencyKey)).size, 4);
    assert.equal(ledger.size, 4);
    assert.equal(conflicts(), 0);
    assert.ok(!requests.some(request => request.path.includes('payment-create') || request.path.includes('payment-confirm')));
  });
}
