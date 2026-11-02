import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const retired = ['get_themes', 'activate_theme', 'deactivate_theme', 'set_theme_ink_mode'];
for (const privateChat of [false, true]) test(`themes 下架能力不可发现，旧调用不访问业务 private=${privateChat}`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'fixture' } } } });
  t.after(() => app.dispose());
  let backendCalls = 0;
  t.mock.method(axios, 'create', () => { backendCalls++; throw new Error('retired action reached backend'); });
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const event = privateChat ? app.events.privateMessage({ platform: 'qq-bot', userId: 'retired-player' }) : app.events.groupMessage({ platform: 'qq-bot', userId: 'retired-player' });
  const result = await app.invoke(event, async () => {
    const client = Expose.create();
    const provider = client.list(GAME_EXPOSE_PROTOCOL).find(item => item.name === 'xiuxian-game')!;
    for (const action of retired) {
      assert.equal(provider.actions[action], undefined, action);
      const response = await client.call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, {});
      assert.equal(response.ok, false, action);
    }
    assert.ok(provider.actions.get_inventory);
    assert.ok(provider.actions.confirm_shop_purchase);
    for (const action of ['get_execution_policy', 'get_conversation_contract', 'get_play_context']) {
      const response = await client.call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, {});
      assert.equal(response.ok, true, JSON.stringify(response));
      for (const name of retired) assert.ok(!JSON.stringify(response).includes('"' + name + '"'), `${action}: ${name}`);
    }
  }, 'ai-plugin');
  assert.deepEqual(result.errors, []);
  assert.equal(backendCalls, 0);
});
