import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { parseSeclusionEnd } from '../src/api/bot/seclusion-end';
import { parseMeditationEnd } from '../src/api/bot/meditation';
import { parseBackendCompanionDualCultivation } from '../src/api/bot/companion-relationship-actions';

test('actual Go credit receipts preserve zero and different dual participant balances', () => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestGoldFingerDualReceiptReportsActualBalancesAtCap$|^TestGoldFingerMeditationReceiptReportsActualCredit$', '-count=1', '-v'], {
    cwd: new URL('../../xiuxian-game-server/', import.meta.url),
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024
  });
  const dualRaw = output.match(/GOLD_FINGER_DUAL_CREDIT=(.+)/)?.[1];
  assert.ok(dualRaw, 'actual dual credit receipt missing');
  const dual = JSON.parse(dualRaw);
  const parsed = parseBackendCompanionDualCultivation(dual);
  assert.equal(parsed.experienceGained, 330, 'legacy theoretical amount remains compatible');
  assert.equal(parsed.creditedExperience, 1);
  assert.equal(parsed.partnerCreditedExperience, 0);
  assert.throws(() => parseBackendCompanionDualCultivation({ ...dual, partnerCreditedExperience: '0' }));

  const meditationRows = [...output.matchAll(/GOLD_FINGER_MEDITATION_CREDIT=(.+)/g)].map(match => JSON.parse(match[1]));
  assert.equal(meditationRows.length, 2);
  assert.deepEqual(meditationRows.map(row => parseMeditationEnd(row).creditedExperience), [1, 0]);
  for (const row of meditationRows) {
    assert.equal(parseMeditationEnd(row).expGained, 17);
    assert.throws(() => parseMeditationEnd({ ...row, creditedExperience: '0' }));
    const legacy = { ...row };
    delete legacy.creditedExperience;
    assert.equal(parseMeditationEnd(legacy).creditedExperience, undefined, 'missing credit is unknown, not zero or theoretical EXP');
  }
});


test('actual Go gathering receipt preserves progress, refund and capped preview', () => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestExplorationGatheringRollbackIsolationAndReadonlyPreview$', '-count=1', '-v'], {
    cwd: new URL('../../xiuxian-game-server/', import.meta.url), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
  });
  const receiptText = output.match(/EXPLORATION_GATHERING_RECEIPT=(.+)/)?.[1];
  assert.ok(receiptText);
  const receipt = JSON.parse(receiptText);
  const parsed = parseSeclusionEnd(receipt);
  assert.equal(parsed.refundedSpirit, 18);
  assert.equal(parsed.creditedExperience, 20);
  assert.equal(parsed.materialProgressPercent, 41.6);
  assert.equal(parsed.gatheredMaterialCount, 0);
  assert.throws(() => parseSeclusionEnd({ ...receipt, materialProgressPercent: 100 }));
  assert.throws(() => parseSeclusionEnd({ ...receipt, gatheredMaterialCount: '0' }));
  const previewText = output.match(/EXPLORATION_GATHERING_PREVIEW=(.+)/)?.[1];
  assert.ok(previewText);
  const preview = JSON.parse(previewText);
  assert.equal(preview.projectedCreditedExperience, 10);
  assert.equal(preview.experienceCapWarning, true);
});
