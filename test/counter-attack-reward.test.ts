import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBackendCounterAttack } from '../src/api/bot/counter-attack';

const receipt = {
  pkRulesVersion: 1, pkEventId: 71, won: true, actorSide: 'B', pkState: 'counter_won', pkDeliveryState: 'restored',
  counterDeadline: '2026-10-24T10:00:00+08:00', targetName: '对手', winner: 'B', battleLogId: 'counter-71', bonusText: '',
  qiCost: 0, stoneReward: 0, crystalReward: 0, shaQiChange: 0, shaQiBonus: 0, experience: 42,
  battle: { rounds: 2, sideA: [{ name: '对手', hp: 0, maxHp: 100, dead: true }], sideB: [{ name: '本人', hp: 90, maxHp: 100, dead: false }] }
};

test('free counter accepts server participation experience without accepting costs or currency', () => {
  assert.equal(parseBackendCounterAttack(receipt).expReward, 42);
  assert.equal(parseBackendCounterAttack({ ...receipt, experience: 0 }).expReward, 0);
  for (const field of ['qiCost', 'stoneReward', 'crystalReward', 'shaQiChange']) {
    assert.throws(() => parseBackendCounterAttack({ ...receipt, [field]: 1 }));
  }
  for (const experience of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, undefined]) {
    assert.throws(() => parseBackendCounterAttack({ ...receipt, experience }));
  }
});
