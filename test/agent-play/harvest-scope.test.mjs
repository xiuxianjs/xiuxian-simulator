import test from 'node:test';
import assert from 'node:assert/strict';
import { requestedHarvestPlot } from '../../src/agent-play/harvest-scope.ts';
test('harvest scope preserves own all or one explicit plot independently of scheduling time', () => {
  for (const [text, expected] of [
    ['十分钟后采收本人灵田', 0], ['明天9点采收全部灵田', 0], ['明天采收灵田2', 2],
    ['明天采收第2块灵田', 2], ['明天采收灵田的第二块', 2], ['明天采收二号田', 2],
    ['每隔两小时采收第二十三块灵田', 23], ['明天采收灵田2147483647', 2147483647]
  ]) assert.equal(requestedHarvestPlot(text), expected, text);
});
test('multiple, fractional, negative and ambiguous plot scopes cannot become a single plot or all plots', () => {
  for (const text of ['采收灵田2和3', '采收第2、3块灵田', '采收灵田2至3', '采收灵田2.5', '采收第2.5块灵田', '采收第-2块灵田', '采收灵田二点五', '采收灵田0', '采收灵田2147483648', '采收上一块灵田', '采收全部灵田2', '采收灵田第一百块']) {
    assert.throws(() => requestedHarvestPlot(text), undefined, text);
  }
});
