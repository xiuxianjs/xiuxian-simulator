import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Expose, shutdownLogger } from 'alemonjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
import { businessEnvelope, gameFixture } from './fixture';

after(async () => { await shutdownLogger(); });

for (const rulesVersion of ['treasure-v5-priority-20261029', 'treasure-v7-v5-shape12-20261029', 'treasure-v8-first-guards-20261029']) {
  test(`Expose探索概览保留概率模式且兼容旧回执 ${rulesVersion}`, async t => {
    const byMode = !rulesVersion.startsWith('treasure-v5-');
    const rates = [
      { rarity: 4, name: '稀有', single: .04058164382274883, ten: .05 },
      { rarity: 5, name: '史诗', single: .017044290405554594, ten: .021 },
      { rarity: 6, name: '神话', single: .009577267942168708, ten: .0118 }
    ];
    const data = {
      rulesVersion,
      serverDate: '2026-10-29',
      balances: { spiritCrystal: 30000, daoCrystal: 108, treasureMaps: 10 },
      freeAvailable: true,
      spiritTenDiscountAvailable: true,
      totalExplorations: 305,
      milestoneProgress: 5,
      pendingSelections: 1,
      shapeRates: { singleComplete: .12, tenExpectedComplete: 1.478500976009402, tenAverageComplete: .1478500976009402 },
      pity: rates.map((rate, index) => ({ rarity: rate.rarity, name: rate.name, counter: [13, 28, 119][index], hardPity: [20, 50, 120][index], nextProbability: .05 })),
      wholeRates: rates.map(rate => ({ rarity: rate.rarity, name: rate.name, probability: byMode ? rate.single : rate.ten, ...(byMode ? { tenProbability: rate.ten } : {}), scope: byMode ? 'all_explorations_by_mode' : 'all_explorations' })),
      rules: ['每次探索获得100经验'],
      records: []
    };
    const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, data));
    await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'get_ancient_relics', {}), 'ai-plugin');
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
    if (result.value.ok) {
      const projected = (result.value.data as { result: { wholeRates: unknown[]; detailsJson: string } }).result;
      assert.deepEqual(projected.wholeRates, data.wholeRates);
      assert.deepEqual(JSON.parse(projected.detailsJson).wholeRates, data.wholeRates);
    }
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, '/api/v2/robot/business/ancient-relics.overview');
    assert.deepEqual(requests[0].body.arguments, {});
  });
}
