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

test('new commands and subcommands match before older wildcard rules', () => {
  for (const [command, name] of [
    ['/渡劫开劫 example', '渡劫开劫'],
    ['/心魔回答 example', '心魔回答'],
    ['/确认锻造委托 example', '确认锻造委托'],
    ['/确认神魂 example', '确认神魂'],
    ['/奇遇选择 123 2', '奇遇选择'],
    ['/垂钓 结算', '垂钓'],
    ['/战斗回忆翻页 example 2', '战斗回忆翻页'],
    ['/成就 一键领取', '成就 一键领取'],
    ['/一键领取', '月卡领取'],
    ['/炼丹 确认 example', '炼丹 确认'],
    ['/卸下称号', '卸下称号'],
    ['/打劫记录 2', '打劫记录'],
    ['/妖塔排行榜 2', '妖塔排行榜'],
    ['/境界排行榜 2', '境界排行榜'],
    ['/购买 123', '商店购买'],
    ['/切磋 123', '比试']
  ]) {
    assert.equal(classifyFeature(command)?.feature_name, name, command);
  }
  assert.equal(classifyFeature('/任务外的文字'), null);
});
