import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backendRequestTimeout, isBattleOperation } from '../../src/api/bot/battle-request';
import { caveRecoveryTips } from '../../src/response/caveRecovery';

// Cave batch actions settle several plots through their own per-step
// transactions, so one command costs about as much as four single-plot
// commands. They must keep the settlement budget instead of the default
// configured timeout that produced `Request timed out` in the wild.
const settlements = ['cave.tend-all', 'cave.companion-tend-all', 'cave.harvest'];

test('cave batch settlement actions keep a settlement budget without changing queries or battles', () => {
  for (const route of ['post_robot_business_operation', 'post_v2_robot_business_operation'] as const) {
    for (const operation of settlements) {
      const parameters = { path: { operation } };
      assert.equal(backendRequestTimeout(route, 10_000, parameters), 60_000);
      // A longer configured budget is never shortened.
      assert.equal(backendRequestTimeout(route, 90_000, parameters), 90_000);
      // The settlement budget must not reclassify these as battles: battle
      // wording would replace the authoritative business receipt.
      assert.equal(isBattleOperation(route), false);
    }
    for (const operation of ['cave.water', 'cave.worm', 'cave.weed', 'cave.cultivate', 'cave.plant', 'cave.query']) {
      assert.equal(backendRequestTimeout(route, 10_000, { path: { operation } }), 10_000, operation);
    }
    for (const parameters of [undefined, null, {}, { path: null }, { path: { operation: 1 } }]) {
      assert.equal(backendRequestTimeout(route, 10_000, parameters), 10_000);
    }
  }
});

test('cave tend-all timeout keeps the plot verification entry instead of a bare refusal', () => {
  for (const failure of ['Request timed out', 'Network request failed', 'Request aborted', '操作失败，请稍后重试']) {
    const own = caveRecoveryTips('cave.tend-all', failure);
    assert.ok(own.length > 0, `cave.tend-all ${failure}`);
    assert.equal(own[0].command, '/灵田');
    assert.match(own[0].description, /部分失败不等于整批回滚/);

    // The companion route is handled by the social branch: it must keep the
    // companion entry and the same "no batch replay" promise.
    const companion = caveRecoveryTips('cave.companion-tend-all', failure);
    assert.ok(companion.length > 0, `cave.companion-tend-all ${failure}`);
    assert.equal(companion[0].command, '/我的道侣');
    assert.match(companion[0].description, /不自动重放整批照料或代收割/);
  }
  // Successful receipts and unrelated text must not grow a recovery entry.
  for (const line of ['浇灌：2 项', '收割：暂无成熟灵植', '灵田无须照料。']) {
    assert.deepEqual(caveRecoveryTips('cave.tend-all', line), []);
  }
});
