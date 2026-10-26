import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { mockBackendConfig } from './backend-config-helper';
import { getBackendFlyMailHome } from '../src/api/bot/fly-mail-queries';
import type { FlyMailScope } from '../src/api/schemas/fly-mail-query';

type Fixture = { uid: number; scope: FlyMailScope; page: number; response: Record<string, unknown> };

test('flymail home consumes actual read-only Go scope, historical and paging projections', async t => {
  const output = execFileSync('go', ['test', './internal/service', '-run', '^TestRobotFlyMailHomeAdapterContractSerialization$', '-count=1', '-v'], {
    cwd: new URL('../../xiuxian-game-server/', import.meta.url),
    env: { ...process.env, GOMODCACHE: process.env.GOMODCACHE ?? '/tmp/xiuxian-go-mod-cache' },
    maxBuffer: 8 * 1024 * 1024
  }).toString();
  const encoded = output.split('\n').find(line => line.includes('FLYMAIL_HOME_ADAPTER_FIXTURES='))?.split('FLYMAIL_HOME_ADAPTER_FIXTURES=')[1];
  assert.ok(encoded, 'actual flymail home fixtures missing');
  const fixtures = JSON.parse(encoded) as Record<string, Fixture>;
  let payload: unknown;
  let lastURL = '';
  let calls = 0;
  const server = createServer((req, res) => {
    lastURL = req.url ?? '';
    calls++;
    assert.equal(req.method, 'GET');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: payload }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  const run = () => getBackendFlyMailHome('player', 1, 'friend', 1);
  try {
    for (const [key, fixture] of Object.entries(fixtures)) {
      payload = fixture.response;
      const parsed = await getBackendFlyMailHome('player', fixture.uid, fixture.scope, fixture.page);
      const list = fixture.response.list as Record<string, unknown>[];
      const expected = { ...fixture.response, list: list.map(row => {
        // HomeQuery uses the shared message DTO but does not populate its realtime bubble field.
        const { bubbleType: _bubbleType, ...home } = row;
        return { ...home, createdAt: new Date(row.createdAt as string) };
      }) };
      assert.deepEqual(parsed, expected, key);
      const url = new URL(lastURL, 'http://contract');
      assert.equal(url.pathname, `/api/v1/players/${fixture.uid}/flymail`);
      assert.equal(url.searchParams.get('scope'), fixture.scope);
      assert.equal(url.searchParams.get('page'), String(fixture.page));
    }
    assert.equal(fixtures.emptyOutside.response.page, 99);
    assert.equal(fixtures.emptyOutside.response.totalPage, 1);
    assert.equal(fixtures.deniedOutside.response.page, 99);
    assert.equal((fixtures.zeroSender.response.list as Record<string, unknown>[])[0].senderUid, 0);
    assert.equal((fixtures.nullSender.response.list as Record<string, unknown>[])[0].senderUid, 0);
    assert.equal((fixtures.signedMute.response.muteList as Record<string, unknown>[])[0].uid, -4);
    assert.equal((fixtures.signedRealmLevel.response.access as Record<string, unknown>).realmLevel, -1);
    const base = fixtures.friend.response;
    const setField = (path: (string | number)[], value: unknown) => {
      const copy = structuredClone(base);
      let row = copy;
      for (const part of path.slice(0, -1)) row = row[part] as Record<string, unknown>;
      row[path.at(-1) as string] = value;
      payload = copy;
    };
    const integers: (string | number)[][] = [
      ['page'], ['total'], ['totalPage'], ['access', 'realmLevel'], ['muteList', 0, 'uid'],
      ['list', 0, 'id'], ['list', 0, 'senderUid'], ['list', 0, 'conversationId']
    ];
    for (const path of integers) {
      for (const value of [undefined, null, '1', 1.25, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        setField(path, value);
        await assert.rejects(run(), /不完整/);
      }
    }
    for (const path of [['page'], ['total'], ['totalPage'], ['list', 0, 'id'], ['list', 0, 'senderUid'], ['list', 0, 'conversationId']] as (string | number)[][]) {
      setField(path, -1);
      await assert.rejects(run(), /不完整/);
    }
    for (const path of [['access', 'realmName'], ['muteList', 0, 'name'], ...['senderName', 'content', 'title', 'createdAt'].map(field => ['list', 0, field])] as (string | number)[][]) {
      for (const value of [undefined, null, 1]) {
        setField(path, value);
        await assert.rejects(run(), /不完整/);
      }
    }
    for (const value of [null, [], {}, { ...base, access: [] }, { ...base, muteList: [null] }, { ...base, list: [null] }, { ...base, list: {} }, { ...base, scope: 'team' }]) {
      payload = value;
      await assert.rejects(run(), /不完整/);
    }
    setField(['list', 0, 'createdAt'], 'invalid-date');
    await assert.rejects(run(), /不完整/);
    setField(['list', 0, 'scope'], 'team');
    await assert.rejects(run(), /不完整/);
    setField(['list', 0, 'kind'], 'conversation');
    await assert.rejects(run(), /不完整/);
    const before = calls;
    for (const uid of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(getBackendFlyMailHome('player', uid, 'friend', 1));
    }
    for (const page of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(getBackendFlyMailHome('player', 1, 'friend', page));
    }
    for (const bid of [undefined, '', '   ']) {
      await assert.rejects(getBackendFlyMailHome(bid, 1, 'friend', 1), /缺少平台身份/);
    }
    assert.equal(calls, before, 'invalid request parameters do not reach transport');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
