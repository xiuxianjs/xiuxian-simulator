import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatRealmRequirementDetails } from '../src/utils/realmRequirements';

const nextRealm = { name: '目标境界' };
test('promotion displays server available quantities and exact shortage', () => {
  const lines = formatRealmRequirementDetails({ nextRealm, materials: [
    { itemName: '材料甲', currentQuantity: 2, requiredQuantity: 5 },
    { itemName: '材料乙', currentQuantity: 7, requiredQuantity: 3 }
  ] }, true);
  assert.deepEqual(lines, ['晋级目标：目标境界', '材料甲：可用 2 / 需要 5（还缺 3）', '材料乙：可用 7 / 需要 3（已满足）', '晋级仅计未锁定材料']);
});
test('breakthrough does not claim the promotion unlocked-only rule', () => {
  const lines = formatRealmRequirementDetails({ nextRealm, materials: [{ itemName: '材料甲', currentQuantity: 3, requiredQuantity: 3 }] });
  assert.deepEqual(lines, ['突破目标：目标境界', '材料甲：持有 3 / 需要 3（已满足）']);
});
test('missing or malformed data never looks like no materials required', () => {
  assert.deepEqual(formatRealmRequirementDetails({ nextRealm }, true), ['晋级目标：目标境界', '材料明细暂不可用']);
  assert.deepEqual(formatRealmRequirementDetails({ nextRealm, materials: [{ itemName: '材料甲', requiredQuantity: 1 }] }, true), ['晋级目标：目标境界', '材料明细暂不可用']);
  assert.deepEqual(formatRealmRequirementDetails({ nextRealm, materials: [] }, true), ['晋级目标：目标境界', '无需材料']);
  assert.deepEqual(formatRealmRequirementDetails({ nextRealm: null, materials: [] }, true), []);
});
