import test from 'node:test';
import assert from 'node:assert/strict';
import { Expose } from 'alemonjs';
import { gameExpose } from '../../src/expose/index.ts';
import { gameFixture, businessEnvelope } from '../framework/fixture.ts';

for (const legacy of [false, true]) test(`actual design and navigation queries exclude retired gameplay: legacy=${legacy}`, async t => {
 const feature = (id, name, entryPaths) => ({ id, name, entryPaths, description: '实际规则', realm: '炼气四层', realmReached: false, visible: false, conditions: ['需满足原资格'] });
 const stage = { stageLevel: 1, stageName: '炼气', realmName: '炼气一层', unlocks: [{ realm: '炼气四层', unlocked: false, features: ['宗门', '宗门大比', '闭关', ...(legacy ? [] : ['竞赛详情'])] }] };
 const content = {
  intro: '规则说明', realmUnlocks: stage.unlocks.map(({ unlocked, ...row }) => row), notes: ['师门需要满足原境界', '宗门大比需要先加入宗门'],
  ...(!legacy ? { gateVersion: 1, currentStage: stage, nextStage: { ...stage, stageLevel: 2 },
   featureCatalog: [{ stageLevel: 1, stageName: '炼气', features: [
    feature('guilds', '宗门', ['/我的宗门', '/宗门大比']), feature('competition', '竞赛详情', ['/宗门大比']),
    feature('meditation', '闭关', ['/闭关']), feature('activities', '限时活动', ['/限时活动', '/限时活动 商店'])
   ] }], commandFeatures: { '我的宗门': 'guilds', '宗门大比': 'competition', '查看晋级赛队伍': 'competition', '闭关': 'meditation', '限时活动': 'activities', '限时活动 商店': 'activities' }
  } : {})
 };
 const original = JSON.stringify(content);
 const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, request.path.endsWith('/navigation.help')
  ? { registered: true, moreVisibleCommands: ['/宗门大比', '/我的宗门'], foldVisibleCommands: ['黑盒拍卖', '/我是 黑盒 男', '/闭关', '/限时活动 商店', '/限时活动'] } : content));
 await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
 const run = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: `design-${legacy}`, text: '修仙怎么玩' }), async () => {
  const result = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'get_tianshu', {});
  assert.equal(result.ok, true, JSON.stringify(result));
  const data = result.data.result;
  assert.deepEqual(data.realmUnlocks, [{ realm: '炼气四层', features: ['宗门', '闭关'] }]);
  assert.deepEqual(data.notes, ['师门需要满足原境界']);
  assert.doesNotMatch(JSON.stringify(data), /宗门大比|竞赛详情|查看晋级赛队伍|限时活动 商店/u);
  if (!legacy) {
   assert.equal(data.currentStage.stageLevel, 1);
   assert.equal(data.nextStage.stageLevel, 2);
   assert.deepEqual(data.currentStage.unlocks, data.realmUnlocks.map(row => ({ ...row, unlocked: false })));
   assert.deepEqual(data.featureCatalog[0].features.map(item => item.id), ['guilds', 'meditation', 'activities']);
   assert.deepEqual(data.featureCatalog[0].features[0], feature('guilds', '宗门', ['/我的宗门']));
   assert.deepEqual(data.commandFeatures.map(item => item.command), ['我的宗门', '闭关', '限时活动']);
  }
  const navigation = await Expose.create().call('xiuxian.player.v1', 'xiuxian-game', 'get_navigation', {});
  assert.equal(navigation.ok, true, JSON.stringify(navigation));
  assert.deepEqual(navigation.data.result, { registered: true, moreVisibleCommands: ['/我的宗门'], foldVisibleCommands: ['/我是 黑盒 男', '/闭关', '/限时活动'] });
 }, 'ai-plugin');
 assert.deepEqual(run.errors, []);
 assert.equal(requests.length, 2);
 assert.equal(JSON.stringify(content), original);
});
