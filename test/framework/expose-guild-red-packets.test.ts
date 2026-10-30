import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildRedPacket(sReadSettlementRollbackAndReplay|SendValidationTransactionsAndReplay)$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8' }).toString();
const rows = [...output.matchAll(/ROBOT_GUILD_RED_PACKETS_RESPONSE=([^|]+)\|player\|(.+)/g)].map(row => ({ op: row[1], envelope: JSON.parse(row[2]) }));
const sends = [...output.matchAll(/ROBOT_GUILD_RED_PACKET_SEND_RESPONSE=player\|(.+)/g)].map(row => ({ op: 'guild.red-packet-send', envelope: JSON.parse(row[1]) }));
test('宗门红包查询、发送及结算保持原身份和服务端回执', async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose()); await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let op = ''; let args: any = {}; let envelope: any; const keys: string[] = [];
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${op}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    if (op === 'guild.red-packet-claim') assert.equal(body.messageText, '/领红包 1');
    assert.deepEqual(body.arguments, args); keys.push(request.headers['idempotency-key']);
    return { status: 200, headers: {}, data: JSON.stringify(envelope) };
  } }));
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  for (const [operation, action, input, expected, read] of [
    ['guild.red-packets', 'get_guild_red_packets', {}, {}, true],
    ['guild.my-red-packets', 'get_sent_guild_red_packets', {}, {}, true],
    ['guild.red-packet-claim', 'claim_guild_red_packet', { packetId: 1 }, { packetId: 1 }, false],
    ['guild.red-packet-recycle', 'recycle_guild_red_packet', { packetId: 11 }, { packetId: 11 }, false],
    ['guild.red-packet-send', 'send_guild_red_packet', { currency: 'contribution', count: 5, amount: 100 },
      { currency: '贡献点', count: { text: '5', value: 5 }, amount: { text: '100', value: 100 } }, false]
  ] as const) {
    op = operation; args = expected;
    const fixture = [...rows, ...sends].find(row => row.op === op && row.envelope.data.success && row.envelope.data.branch === 'business' &&
      (action === 'claim_guild_red_packet' ? row.envelope.data.data?.packetId === 1 : action === 'recycle_guild_red_packet' ? row.envelope.data.data?.packetId === 11 :
        action === 'send_guild_red_packet' ? row.envelope.data.data?.receipt?.currencyType === 'contribution' : row.envelope.data.data?.packets?.length > 0));
    envelope = structuredClone(fixture?.envelope); assert.ok(envelope, action);
    const call = () => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, input), 'ai-plugin');
    const result = await call(); assert.equal(result.value.ok, true, `${action}: ${JSON.stringify(result.value)}`);
    if (result.value.ok && action === 'recycle_guild_red_packet') assert.equal((result.value.data as any).result.refundAmount, 300);
    await call(); if (read) assert.notEqual(keys.at(-1), keys.at(-2)); else assert.equal(keys.at(-1), keys.at(-2));
    if (action === 'send_guild_red_packet') {
      const send = (intentId: string) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', action, { ...input, intentId }), 'ai-plugin');
      assert.equal((await send('first')).value.ok, true); const key = keys.at(-1);
      assert.equal((await send('first')).value.ok, true); assert.equal(keys.at(-1), key);
      assert.equal((await send('second')).value.ok, true); assert.notEqual(keys.at(-1), key);
    }
    if (action === 'claim_guild_red_packet') { envelope.data.data.packetId = 2; const mismatch = await call(); assert.equal(mismatch.value.ok, false); }
  }
  const before = keys.length;
  const invalid = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', 'send_guild_red_packet', { currency: 'contribution', count: 6, amount: 100 }), 'ai-plugin');
  assert.equal(invalid.value.ok, false); assert.equal(keys.length, before);
});
