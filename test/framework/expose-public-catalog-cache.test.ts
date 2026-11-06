import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotPublic(Catalog|RecipeCatalog)VersionProtocol$', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8'
}).toString();
const rows = [...output.matchAll(/PUBLIC_CATALOG_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(row => ({ operation: row[1], phase: row[2], envelope: JSON.parse(row[3]) }));

test('公开目录跨消息复用内容，每次仍执行服务端准入，配置变化后替换', async t => {
  assert.equal(rows.length, 24);
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://catalog.invalid', robot_auth_token: 'offline' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  let current = rows[0];
  const versions = new Map<string, string>();
  const keys = new Set<string>();
  let requests = 0;
  let transportFailure = false;

  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    requests++;
    assert.equal(new URL(request.url).pathname, `/api/v2/robot/business/${current.operation}`);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.deepEqual(body.arguments, { page: 1, pageSize: 100, knownVersion: versions.get(current.operation) ?? '' });
    assert.ok(!keys.has(request.headers['idempotency-key']), 'each observation must reach fresh admission');
    keys.add(request.headers['idempotency-key']);
    if (transportFailure) throw new Error('offline test transport unavailable');

    return { status: 200, headers: {}, data: JSON.stringify(current.envelope) };
  } }));
  const actions: Record<string, string> = {
    'base.grades': 'get_base_grades', 'base.equipment-types': 'get_base_equipment_types',
    'base.skill-types': 'get_base_skill_types', 'base.realms': 'get_base_realms',
    'base.alchemy-recipes': 'get_base_alchemy_recipes', 'base.forge-recipes': 'get_base_forge_recipes'
  };
  const expected = new Map<string, unknown>();

  for (current of rows) {
    const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
    const run = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', actions[current.operation], { pageSize: 100 }), 'ai-plugin');
    assert.equal(run.value.ok, true, JSON.stringify(run.value));
    if (!run.value.ok) continue;
    const result = run.value.data as any;

    if (current.phase === 'muted') {
      assert.equal(result.branch, 'middleware');
      assert.equal(result.reason, 'MUTED');
      assert.equal(result.result, undefined);
      assert.deepEqual(result.replies, current.envelope.data.middleware.replies);
    } else {
      if (current.phase !== 'unchanged') {
        const { catalogVersion, ...page } = current.envelope.data.data;
        versions.set(current.operation, catalogVersion);
        expected.set(current.operation, page);
      }
      assert.deepEqual(result.result, expected.get(current.operation));
      if (current.operation === 'base.realms') assert.equal(result.result.items[0].attributePoints, 17);
      assert.equal(result.result.catalogVersion, undefined, 'protocol metadata must not enter the exposed result');
      result.result.items[0].name = 'caller mutation must not poison cached content';
    }
  }
  assert.equal(requests, rows.length);
  transportFailure = true;
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player' });
  const failed = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', actions[current.operation], { pageSize: 100 }), 'ai-plugin');
  assert.equal(failed.value.ok, false, 'network failure cannot turn into cached business success');
  assert.equal(requests, rows.length + 1, 'no hidden retry or fallback request');
});
