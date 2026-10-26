import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const result = await build({ entryPoints: ['src/analytics/classifier.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { classifyFeature } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

test('one-click aliases retain the original feature classification', () => {
  const aliases = [
    ['一键领取日常活跃奖励', '领取全部日常活跃奖励'],
    ['一键领取周常活跃奖励', '领取全部周常活跃奖励'],
    ['一键领取宗门日活奖励', '领取宗门日活奖励'],
    ['一键领取宗门周活奖励', '领取宗门周活奖励'],
    ['领取全部宗门日活奖励', '领取宗门日活奖励'],
    ['领取全部宗门周活奖励', '领取宗门周活奖励'],
    ['一键领取月卡', '月卡领取'],
    ...['浇灌', '除虫', '除草', '收割'].map(action => [`一键${action}`, action])
  ];
  for (const prefix of ['', '/', '#', '＃', '!', '！']) {
    for (const [alias, original] of aliases) {
      assert.ok(classifyFeature(prefix + original));
      assert.deepEqual(classifyFeature(prefix + alias), classifyFeature(prefix + original), prefix + alias);
    }
  }
});
