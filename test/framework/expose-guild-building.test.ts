import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuild(UpgradesCostsCapsRollbackAndReplay|ShopTransactionsProjectionAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const upgrades = [...output.matchAll(/ROBOT_GUILD_UPGRADE_RESPONSE=([^|]+)\|player\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
const shops = [...output.matchAll(/ROBOT_GUILD_SHOP_RESPONSE=([^|]+)\|player\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
test('宗门升级与刷新保留实际消耗和页面失败边界', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, {}); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const [operation, action] of [
    ['guild.upgrade-level', 'upgrade_guild_level'], ['guild.upgrade-vein', 'upgrade_guild_vein'],
    ['guild.upgrade-shop', 'upgrade_guild_shop'], ['guild.shop-refresh', 'refresh_guild_shop']
  ] as const) {
    op = operation; envelope = structuredClone([...upgrades, ...shops].find(row => row.op === op && row.envelope.data.success && row.envelope.data.branch === 'business')?.envelope);
    assert.ok(envelope, action);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, {}), 'ai-plugin');
    const response = await call(); assert.equal(response.value.ok, true, `${action}: ${JSON.stringify(response.value)}`);
    if (response.value.ok && action === 'upgrade_guild_level') assert.equal((response.value.data as any).result.receipt.spiritStoneCost, 40);
    await call(); assert.equal(keys.at(-1), keys.at(-2));
    if (action === 'refresh_guild_shop') {
      envelope.data.data.page = null;
      const partial = await call(); assert.equal(partial.value.ok, true);
      if (partial.value.ok) assert.match((partial.value.data as any).result.pageError, /刷新已完成/);
      envelope = structuredClone(shops.find(row => row.op === op && !row.envelope.data.success && JSON.stringify(row.envelope).includes('page unavailable'))!.envelope);
      const ambiguous = await call(); assert.equal(ambiguous.value.ok, true);
      if (ambiguous.value.ok) { assert.equal((ambiguous.value.data as any).success, false); assert.match(JSON.stringify((ambiguous.value.data as any).replies), /page unavailable/); }
    }
  }
});
