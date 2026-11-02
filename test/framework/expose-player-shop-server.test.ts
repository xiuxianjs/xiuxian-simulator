import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { shutdownLogger } from 'alemonjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
after(() => shutdownLogger());
test('停用小店不移除珍宝楼交易、普通商店和对话生命周期', () => {
  const configs = gameExpose.getConfigs();
  const player = configs.find(config => config.name === GAME_EXPOSE_PROTOCOL)!;
  assert.ok(configs.some(config => config.name === 'agent.conversation.v1'));
  for (const name of ['browse_market', 'prepare_market_purchase', 'confirm_market_purchase', 'get_shop_products', 'preview_shop_purchase', 'confirm_shop_purchase']) assert.ok(player.actions[name], name);
  assert.ok(!Object.keys(player.actions).some(name => name.includes('player_shop')));
});
