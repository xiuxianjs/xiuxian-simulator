import assert from 'node:assert/strict';
import test from 'node:test';
import { caveActionCommand } from '../src/api/bot/cave-robot-command';
import { parseBackendCaveAccelerationPreview } from '../src/api/bot/cave-plot-actions';
import { parseMeditationBoostOptions } from '../src/api/bot/meditation';

test('spirit stone acceleration and ripening preserve distinct commands', () => {
 assert.equal(caveActionCommand('/灵田加速 1 灵石 1').args.accelerator, 'spiritStone');
 assert.equal(caveActionCommand('/灵田加速 1 催熟 1').args.accelerator, 'ripen');
 assert.equal(caveActionCommand('/灵田加速 1 小绿瓶 1').args.accelerator, 'greenBottle');
});
test('paid preview requires complete server quotes', () => {
 const preview = { found: true, message: '加速预览', plotIndex: 1, greenBottleUsedCount: 0, greenBottleLimit: 1, remainingSeconds: 14400,
 remainingHours: 4, lingfeiCount: 0, greenBottleCount: 0, remainingSlots: 1, maxLingfei: 0, maxGreenBottle: 0,
 spiritStoneEnabled: true, spiritStone: 1000, stoneCost: 50, maxSpiritStone: 1, ripenCost: 150, canRipen: true };
 assert.equal(parseBackendCaveAccelerationPreview(preview).ripenCost, 150);
 assert.throws(() => parseBackendCaveAccelerationPreview({ ...preview, ripenCost: undefined }));
 assert.throws(() => parseBackendCaveAccelerationPreview({ ...preview, stoneCost: -1 }));
 const options = { enabled: true, pricePerInterval: 25, multiplier: 1.5, spiritStone: 1000, maxHours: 48 };
 assert.deepEqual(parseMeditationBoostOptions(options), options);
});
