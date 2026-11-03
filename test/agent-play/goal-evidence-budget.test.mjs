import test from 'node:test';
import assert from 'node:assert/strict';
import { goalEvidence } from '../../src/agent-play/goal-evidence.ts';

const extract = prompt => JSON.parse(prompt.slice(prompt.indexOf('{'), prompt.lastIndexOf('}') + 1));
const content = {
  intro: '按当前境界核对条件', notes: ['可见不等于已满足全部条件'], gateVersion: 1,
  currentStage: { stageLevel: 1, stageName: '炼气', unlocks: [] },
  nextStage: { stageLevel: 2, stageName: '筑基', unlocks: [] },
  featureCatalog: [{ stageLevel: 3, stageName: '后续阶段', features: ['目录'.repeat(1400)] }]
};
for (const success of [true, false]) test(`large design evidence preserves business outcome: ${success}`, async () => {
  const original = { ok: true, data: { success, branch: success ? 'business' : 'middleware', reason: success ? '' : '准入拒绝', result: content } };
  const prompt = await goalEvidence('帮我提升境界', new Map([['get_tianshu', { execute: async () => original }]]), { signal: new AbortController().signal }, () => false);
  const fact = extract(prompt).facts[0].result;
  if (success) {
    assert.equal(fact.data.success, true);
    assert.equal(fact.data.branch, 'business');
    assert.equal(fact.data.reason, '');
    assert.deepEqual(fact.data.result.currentStage, content.currentStage);
    assert.deepEqual(fact.data.result.nextStage, content.nextStage);
    assert.deepEqual(fact.data.result.notes, content.notes);
    assert.equal(fact.data.result.featureCatalog, undefined);
    assert.match(fact.omitted, /不能将摘要当作完整目录/u);
  } else {
    assert.deepEqual(fact, original, 'A middleware rejection must never become a successful design summary');
  }
  assert.equal(original.data.result.featureCatalog.length, 1, 'Original receipt stays intact');
});

test('oversized facts are explicitly unavailable while later observations still run', async () => {
  const calls = [];
  const readers = new Map(['get_tianshu', 'get_profile', 'get_realm'].map(action => [action, { execute: async () => {
    calls.push(action);
    return { ok: true, data: action === 'get_profile' ? { text: '长'.repeat(4000) } : { fact: action } };
  } }]));
  const facts = extract(await goalEvidence('帮我提升境界', readers, { signal: new AbortController().signal }, () => false)).facts;
  assert.deepEqual(calls, ['get_tianshu', 'get_profile', 'get_realm']);
  assert.equal(facts[1].result.ok, false);
  assert.match(facts[1].result.reason, /超出本轮准备资料预算/u);
  assert.equal(facts[2].result.data.fact, 'get_realm');
});

test('cancellation during the final observation discards the prepared evidence', async () => {
  const controller = new AbortController();
  const readers = new Map([['get_realm', { execute: async () => {
    controller.abort(new Error('manual takeover'));
    return { ok: true, data: { eligible: true } };
  } }]]);
  await assert.rejects(goalEvidence('帮我提升境界', readers, { signal: controller.signal }, () => false), /manual takeover/u);
});
