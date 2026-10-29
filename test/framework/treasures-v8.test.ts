import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { shutdownLogger } from 'alemonjs';
import { parseTreasureReceipt } from '../../src/api/bot/treasures';
import { invalidPriorityResults, priorityResult, validPriorityResults } from '../helpers/treasure-v5-fixtures';

after(async () => { await shutdownLogger(); });
const version = 'treasure-v8-first-guards-20261029';
const envelope = (result: ReturnType<typeof priorityResult>) => ({ kind: 'explore', operationId: result.operationId, result });

for (const [name, result] of validPriorityResults()) test(`v8首件保护回执仍只按实际探索计奖：${name}`, () => {
  result.rulesVersion = version;
  const decoded = parseTreasureReceipt(envelope(result));
  assert.equal(decoded.result.rulesVersion, version);
  assert.equal(decoded.result.rewards?.length, result.count);
  assert.equal(decoded.result.experienceGranted, result.count * 100);
});

for (const [name, result] of invalidPriorityResults()) test(`v8拒绝异常回执：${name}`, () => {
  if (result.rulesVersion !== 'treasure-future-unknown') result.rulesVersion = version;
  assert.throws(() => parseTreasureReceipt(envelope(result)), { code: 'SDK_INVALID_RESPONSE' });
});

test('v8继续恢复旧v7成功探索回执', () => {
  const result = priorityResult(10);
  result.rulesVersion = 'treasure-v7-v5-shape12-20261029';
  assert.equal(parseTreasureReceipt(envelope(result)).result.rulesVersion, result.rulesVersion);
});
