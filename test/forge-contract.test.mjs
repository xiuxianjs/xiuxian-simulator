import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseForgeOverview, parseForgePreview, parseForgeResult, parseForgeHistory, parseForgeOrderPreview, parseForgeOrder, parseForgeOrders } from '../src/api/schemas/forge.ts';

// Exported by the real Go service against its isolated synthetic fixture.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/forge-contracts.json', import.meta.url), 'utf8'));

test('Go forge responses satisfy bot contracts, including range, consumption and history', () => {
  const overview = parseForgeOverview(fixture.overview);
  const preview = parseForgePreview(fixture.preview);
  const result = parseForgeResult(fixture.result);
  const history = parseForgeHistory(fixture.history);
  assert.equal(overview.recipes[0].materials[0].available, 10);
  assert.equal(overview.recipes[0].materials[0].listed, 4);
  assert.equal(preview.recipe.attributes.find(a => a.key === 'physicalAttack').min, 950);
  assert.equal(result.equipment.id, history.items[0].result.equipment.id);
  assert.equal(result.name, preview.recipe.equipment.name);
  assert.equal(result.comparisons[0].value, result.equipment.physicalAttack);
});

test('partial or unsafe forge payloads are rejected instead of producing a success bubble', () => {
  const noRange = structuredClone(fixture.preview); delete noRange.recipe.attributes;
  assert.throws(() => parseForgePreview(noRange));
  const noPermission = structuredClone(fixture.preview); delete noPermission.recipe.tradeable;
  assert.throws(() => parseForgePreview(noPermission));
  const unsafe = structuredClone(fixture.result); unsafe.spiritStoneCost = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => parseForgeResult(unsafe));
  const badHistory = structuredClone(fixture.history); badHistory.items[0].owned = 'yes';
  assert.throws(() => parseForgeHistory(badHistory));
});


test('Go commission responses preserve escrow, bound ownership and actionable party', () => {
  const preview = parseForgeOrderPreview(fixture.orderPreview);
  const created = parseForgeOrder(fixture.orderCreated);
  const orders = parseForgeOrders(fixture.orders);
  const delivered = parseForgeOrder(fixture.orderDelivered);
  assert.equal(preview.fee, 7);
  assert.equal(preview.recipe.tradeable, false);
  assert.equal(created.canCancel, true);
  assert.equal(created.canAccept, false);
  assert.equal(orders.items[0].canAccept, true);
  assert.equal(orders.items[0].canCancel, false);
  assert.equal(delivered.result.equipment.userId, created.ownerId);
  assert.equal(delivered.result.crafterId, created.crafterId);
  assert.equal(delivered.canAccept, false);
});

test('commission contract rejects missing delivery, foreign ownership and terminal actions', () => {
  for (const mutate of [
    row => { row.result = null; },
    row => { row.result.equipment.userId = 999; },
    row => { row.result.crafterId = 999; },
    row => { row.canAccept = true; },
    row => { row.fee = -1; },
    row => { row.status = 'unknown'; }
  ]) {
    const row = structuredClone(fixture.orderDelivered); mutate(row);
    assert.throws(() => parseForgeOrder(row));
  }
});


test('escrow total is exact even when individually safe cost and fee would overflow JS precision', () => {
  const max = Number.MAX_SAFE_INTEGER;
  for (const fee of [max - 4, max - 5]) {
    const preview = structuredClone(fixture.orderPreview);
    preview.fee = fee; preview.recipe.spiritStoneCost = 5;
    const order = structuredClone(fixture.orderCreated);
    order.fee = fee; order.spiritStoneCost = 5;
    if (fee === max - 4) {
      assert.throws(() => parseForgeOrderPreview(preview));
      assert.throws(() => parseForgeOrder(order));
    } else {
      assert.equal(parseForgeOrderPreview(preview).fee + 5, max);
      assert.equal(parseForgeOrder(order).fee + 5, max);
    }
  }
});
