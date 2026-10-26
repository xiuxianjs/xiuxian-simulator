import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { mockBackendConfig } from './backend-config-helper';
import { BackendAPIError } from '../src/api/bot/client';
import { sendBackendFlyMail } from '../src/api/bot/flymail-send';

type SendParams = Parameters<typeof sendBackendFlyMail>[0];
type Fixture = {
  uid: number;
  input: Pick<SendParams, 'scope' | 'content' | 'targetUid'>;
  status: number;
  envelope: { data?: { success: boolean; message: string }; error?: { code: string; message: string } };
};

// The producer executes the real Gin route with robot authentication and Idempotency-Key.
// The shim passes those actual HTTP envelopes to the TS SDK unchanged.
test('flymail send adapter accepts real authenticated Gin feedback and business errors', async t => {
  const output = execFileSync('go', ['test', './internal/httpapi', '-run', '^TestRobotFlyMailSendAdapterContractSerialization$', '-count=1', '-v'], {
    cwd: new URL('../../xiuxian-game-server/', import.meta.url),
    env: { ...process.env, GOMODCACHE: process.env.GOMODCACHE ?? '/tmp/xiuxian-go-mod-cache' },
    maxBuffer: 8 * 1024 * 1024
  }).toString();
  const encoded = output.split('\n').find(line => line.includes('FLYMAIL_SEND_ADAPTER_FIXTURES='))?.split('FLYMAIL_SEND_ADAPTER_FIXTURES=')[1];
  assert.ok(encoded, 'actual Gin flymail responses missing');
  const fixtures = JSON.parse(encoded) as Record<string, Fixture>;
  let envelope: unknown;
  let status = 201;
  let lastBody: unknown;
  let lastURL = '';
  let calls = 0;
  const request = { requestId: 'flymail-send-request', idempotencyKey: 'flymail-send-key' };
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    lastBody = body ? JSON.parse(body) : undefined;
    lastURL = req.url ?? '';
    assert.equal(req.method, 'POST');
    assert.equal(req.headers['idempotency-key'], request.idempotencyKey);
    calls++;
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(envelope));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  mockBackendConfig(t, { api_url: `http://127.0.0.1:${address.port}`, robot_auth_token: 'contract-token' });
  const params: SendParams = { bid: 'player', uid: 1, scope: 'friend', targetUid: 2, content: '问好', request };
  try {
    for (const [key, fixture] of Object.entries(fixtures)) {
      envelope = fixture.envelope;
      status = fixture.status;
      const send = () => sendBackendFlyMail({ ...params, ...fixture.input, targetUid: fixture.input.targetUid, uid: fixture.uid });
      if (status === 201) {
        assert.ok(fixture.envelope.data);
        assert.deepEqual(await send(), { message: fixture.envelope.data.message }, key);
      } else {
        assert.ok(fixture.envelope.error);
        await assert.rejects(send(), error => {
          assert.ok(error instanceof BackendAPIError);
          assert.equal(error.status, fixture.status);
          assert.equal(error.code, fixture.envelope.error?.code);
          assert.equal(error.message, fixture.envelope.error?.message);
          return true;
        }, key);
      }
      assert.equal(lastURL, `/api/v1/players/${fixture.uid}/flymail`);
      assert.deepEqual(lastBody, fixture.input, 'content and target selection remain server-owned');
    }
    status = 201;
    envelope = fixtures.master.envelope;
    await sendBackendFlyMail({ ...params, scope: 'master', targetUid: 0 });
    assert.deepEqual(lastBody, { scope: 'master', content: params.content });
    for (const value of [null, [], {}, { success: false, message: '发送失败' }, { success: true, message: null }, { success: true, message: '' }]) {
      envelope = { data: value };
      await assert.rejects(sendBackendFlyMail(params), /响应不完整/);
    }
    const before = calls;
    for (const uid of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(sendBackendFlyMail({ ...params, uid }), /缺少平台身份/);
    }
    for (const bid of [undefined, '', '   ']) {
      await assert.rejects(sendBackendFlyMail({ ...params, bid }), /缺少平台身份/);
    }
    for (const targetUid of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(sendBackendFlyMail({ ...params, targetUid }), /目标参数无效/);
    }
    await assert.rejects(sendBackendFlyMail({ ...params, scope: 'invalid' } as unknown as SendParams), /参数无效/);
    await assert.rejects(sendBackendFlyMail({ ...params, content: 1 } as unknown as SendParams), /参数无效/);
    await assert.rejects(sendBackendFlyMail({ ...params, request: undefined }), /唯一标识/);
    assert.equal(calls, before, 'invalid identity, types and missing replay keys never submit writes');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
