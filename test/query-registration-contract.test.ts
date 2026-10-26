import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';
import { createClient } from '../src/api/core';
import type { APIClient, Identity } from '../src/api/core';
import { operationDefinitions, type OperationId } from '../src/api/registry';

type Parameter = { $ref?: string; in?: string; name?: string; required?: boolean; schema?: Record<string, unknown> };
type RequestBody = { $ref?: string; required?: boolean; content?: Record<string, unknown> };
type Operation = { operationId?: OperationId; parameters?: Parameter[]; servers?: { url: string }[]; security?: Record<string, string[]>[]; requestBody?: RequestBody };
type PathItem = { parameters?: Parameter[]; servers?: { url: string }[] } & Partial<Record<'get' | 'post' | 'put' | 'patch' | 'delete', Operation>>;

test('every registered operation matches Go request metadata and supported path/query constraints', () => {
  const doc = parse(readFileSync(new URL('../../xiuxian-game-server/docs/openapi.yaml', import.meta.url), 'utf8')) as {
    paths: Record<string, PathItem>;
    servers: { url: string }[];
    security: Record<string, string[]>[];
    components: { parameters: Record<string, Parameter>; requestBodies?: Record<string, RequestBody> };
  };
  const parameterFacts = (parameter: Parameter) => ({
    name: parameter.name, required: parameter.required ?? false,
    // Runtime validation does not apply documentation defaults or examples.
    // Omitted minLength and minLength=0 both permit an empty string.
    schema: Object.fromEntries(['type', 'minimum', 'maximum', 'minLength', 'maxLength', 'enum']
      .filter(key => parameter.schema?.[key] !== undefined && !(key === 'minLength' && parameter.schema[key] === 0))
      .map(key => [key, parameter.schema![key]]))
  });
  const checked = new Set<string>();
  const securityFacts = (requirements: readonly Record<string, readonly unknown[]>[]) => requirements
    .map(requirement => JSON.stringify(Object.fromEntries(Object.entries(requirement).sort())))
    .sort();
  const resolve = (parameter: Parameter): Parameter => {
    if (!parameter.$ref) return parameter;
    const prefix = '#/components/parameters/';
    assert.ok(parameter.$ref.startsWith(prefix), `unsupported parameter reference ${parameter.$ref}`);
    const resolved = doc.components.parameters[parameter.$ref.slice(prefix.length)];
    assert.ok(resolved, `missing parameter reference ${parameter.$ref}`);
    return resolved;
  };
  for (const [path, item] of Object.entries(doc.paths)) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      const operation = item[method];
      if (!operation?.operationId) continue;
      const definition = operationDefinitions[operation.operationId];
      // The bot SDK does not register every server endpoint. The final set
      // comparison still requires every SDK operation to be checked.
      if (!definition) continue;
      assert.ok(!checked.has(operation.operationId), `duplicate ${operation.operationId}`);
      checked.add(operation.operationId);
      assert.deepEqual(securityFacts(definition.security), securityFacts(operation.security ?? doc.security), `${operation.operationId}: security drift`);
      let body = operation.requestBody;
      if (body?.$ref) {
        const prefix = '#/components/requestBodies/';
        assert.ok(body.$ref.startsWith(prefix), `unsupported body reference ${body.$ref}`);
        body = doc.components.requestBodies?.[body.$ref.slice(prefix.length)];
        assert.ok(body, `${operation.operationId}: missing referenced request body`);
      }
      assert.equal(definition.bodyRequired, body?.required ?? false, `${operation.operationId}: required body drift`);
      const documentedContent = Object.keys(body?.content ?? {}).sort();
      const registeredContent = definition.requestContentType ? [definition.requestContentType] : [];
      assert.deepEqual(registeredContent, documentedContent, `${operation.operationId}: request content type drift`);
      const base = (operation.servers ?? item.servers ?? doc.servers)[0].url;
      assert.equal(definition.method, method.toUpperCase(), `${operation.operationId}: method drift`);
      assert.equal(definition.path, `${base === '/' ? '' : base}${path}`, `${operation.operationId}: path drift`);
      const parameters = [...(item.parameters ?? []), ...(operation.parameters ?? [])].map(resolve);
      const requiredHeaders = parameters.filter(parameter => parameter.in === 'header' && parameter.required)
        .map(parameter => parameter.name!.toLowerCase()).sort();
      const actualRequiredHeaders = definition.headerParams.filter(parameter => parameter.required)
        .map(parameter => parameter.name.toLowerCase()).sort();
      assert.deepEqual(actualRequiredHeaders, requiredHeaders, `${operation.operationId}: required header drift`);
      for (const [kind, field] of [['query', 'queryParams'], ['path', 'pathParams']] as const) {
        const expected = parameters.filter(parameter => parameter.in === kind).map(parameterFacts)
          .sort((a, b) => a.name!.localeCompare(b.name!));
        const actual = definition[field].map(parameterFacts).sort((a, b) => a.name!.localeCompare(b.name!));
        assert.deepEqual(actual, expected, `${method.toUpperCase()} ${path}: ${kind} parameter drift`);
      }
    }
  }
  assert.deepEqual([...checked].sort(), Object.keys(operationDefinitions).sort(), 'registry operations missing from OpenAPI');
});

test('resource settlement receipt is declared only on the home projection, not activity hub', () => {
  const home = operationDefinitions.post_players_id_home_overview.headerParams.map(parameter => parameter.name);
  const activity = operationDefinitions.get_players_id_activity_hub.headerParams.map(parameter => parameter.name);
  assert.ok(home.includes('X-Command-Resource-Receipt'));
  assert.deepEqual(activity, ['X-Request-ID']);
});

test('newly synchronized cursor queries reach the SDK transport without changing page queries', async () => {
  let receivedURL = '';
  const client = createClient({
    baseUrl: 'https://backend.test',
    identity: { kind: 'robot', token: 'test-token', bid: 'test-player' },
    adapter: async config => {
      receivedURL = config.url ?? '';
      return { config, status: 200, statusText: 'OK', headers: {}, data: '{"data":{}}' };
    }
  });
  const cases = [
    { path: '/players/1/notifications', run: (cursor?: string) => client.request('get_players_id_notifications', { path: { id: 1 }, query: { cursor, page: 2 } }) },
    { path: '/encyclopedia', run: (cursor?: string) => client.request('get_encyclopedia', { query: { cursor, category: '道具', page: 2 } }) },
    { path: '/players/1/storyline/leaderboard', run: (cursor?: string) => client.request('get_players_id_storyline_leaderboard', { path: { id: 1 }, query: { cursor, page: 2 } }) },
    { path: '/players/1/skill-books/learned', run: (cursor?: string) => client.request('get_players_id_skill_books_learned', { path: { id: 1 }, query: { cursor, visibility: 'hidden', page: 2 } }) },
    { path: '/players/1/alchemy/leaderboard', run: (cursor?: string) => client.request('get_players_id_alchemy_leaderboard', { path: { id: 1 }, query: { cursor, page: 2 } }) },
    { path: '/secret-realms', run: (cursor?: string) => client.request('get_secret_realms', { query: { cursor, page: 2 } }) },
    { path: '/market/shops', run: (cursor?: string) => client.request('get_market_shops', { query: { cursor, page: 2 } }) },
    { path: '/players/1/shop/products', run: (cursor?: string) => client.request('get_players_id_shop_products', { path: { id: 1 }, query: { cursor, page: 2 } }) }
  ];
  for (const entry of cases) {
    for (const cursor of [undefined, '', 'next+/=中文']) {
      await entry.run(cursor);
      const url = new URL(receivedURL);
      assert.equal(url.pathname, `/api/v1${entry.path}`);
      assert.equal(url.searchParams.has('cursor'), cursor !== undefined);
      assert.equal(url.searchParams.get('cursor'), cursor ?? null);
      assert.equal(url.searchParams.get('page'), '2');
    }
  }
});

test('required and optional parameters follow the server contract before transport', async () => {
  const urls: string[] = [];
  const client = createClient({
    baseUrl: 'https://backend.test', identity: { kind: 'robot', token: 'test-token', bid: 'test-player' },
    adapter: async config => {
      urls.push(config.url ?? '');
      return { config, status: 200, statusText: 'OK', headers: {}, data: '{"data":{}}' };
    }
  });
  for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(client.request('post_players_id_auth_temporary_password', { path: { id } }), /Invalid parameter id/);
  }
  await assert.rejects(client.request('get_glossary_view', { query: {} } as never), /Missing query parameter action/);
  assert.equal(urls.length, 0, 'invalid input must not reach transport');

  await client.request('post_players_id_auth_temporary_password', { path: { id: 1 } });
  await client.request('get_glossary_view', { query: { action: 'browse' } });
  await client.request('post_players_id_tianshi_baolu_panel_query', { path: { id: 1 } });
  await client.request('post_players_id_tianshi_baolu_panel_query', { path: { id: 1 }, query: { type: 'equipment_set', page: 2 } });
  assert.equal(new URL(urls[2]).search, '', 'omitted panel options must stay omitted for server defaults');
  assert.equal(new URL(urls[3]).searchParams.get('type'), 'equipment_set');
  assert.equal(new URL(urls[3]).searchParams.get('page'), '2');
  assert.equal(urls.length, 4);
});

test('CAPTCHA transitions and role switching require robot identity; switching also requires a replay key', async () => {
  const received: { url: string; authorization: unknown; bid: unknown; key: unknown }[] = [];
  const client = (identity: Identity) => createClient({
    baseUrl: 'https://backend.test', identity,
    adapter: async config => {
      received.push({ url: config.url ?? '', authorization: config.headers.get('Authorization'),
        bid: config.headers.get('X-Bid'), key: config.headers.get('Idempotency-Key') });
      return { config, status: 200, statusText: 'OK', headers: {}, data: '{"data":{}}' };
    }
  });
  const cases: ((client: APIClient) => Promise<unknown>)[] = [
    c => c.request('post_players_id_captcha_state_verify', { path: { id: 1 }, body: { answer: 'test-answer' } }),
    c => c.request('post_players_id_captcha_state_operations_claim', { path: { id: 1 } }),
    c => c.request('post_players_id_captcha_state_mute_reply_claim', { path: { id: 1 } }),
    c => c.request('post_players_id_captcha_state_challenge', { path: { id: 1 } }),
    c => c.request('post_auth_roles_switch', { body: { targetPlayerId: 2 }, idempotencyKey: 'test-switch-event' })
  ];
  for (const identity of [{ kind: 'public' }, { kind: 'user', token: 'test-token' }, { kind: 'worker', token: 'test-token' }] as Identity[]) {
    for (const run of cases) {
      await assert.rejects(run(client(identity)), error => error instanceof Error && 'code' in error && error.code === 'SDK_AUTH_REQUIRED');
    }
  }
  const robot = client({ kind: 'robot', token: 'test-token', bid: 'test-player' });
  await assert.rejects(robot.request('post_auth_roles_switch', { body: { targetPlayerId: 2 } } as never), /idempotencyKey/);
  assert.equal(received.length, 0, 'rejected identities or missing key must not reach transport');
  for (const run of cases) await run(robot);
  assert.equal(received.length, 5);
  for (const request of received) {
    assert.equal(request.authorization, 'Bearer test-token');
    assert.equal(request.bid, 'test-player');
  }
  assert.equal(new URL(received[4].url).pathname, '/api/v1/auth/roles/switch');
  assert.equal(received[4].key, 'test-switch-event');
});

test('kill-god title claim requires and transmits the event key for robot and user callers', async () => {
  const requests: { path: string; key: unknown }[] = [];
  for (const identity of [{ kind: 'robot', token: 'test-token', bid: 'test-player' }, { kind: 'user', token: 'test-token' }] as Identity[]) {
    const client = createClient({
      baseUrl: 'https://backend.test', identity,
      adapter: async config => {
        requests.push({ path: new URL(config.url!).pathname, key: config.headers.get('Idempotency-Key') });
        return { config, status: 200, statusText: 'OK', headers: {}, data: '{"data":{}}' };
      }
    });
    const before = requests.length;
    await assert.rejects(client.request('post_players_id_kill_god_title_claim', { path: { id: 1 } } as never), /idempotencyKey/);
    assert.equal(requests.length, before, 'missing event key must not reach transport');
    await client.request('post_players_id_kill_god_title_claim', { path: { id: 1 }, idempotencyKey: 'title-claim-event' });
    assert.deepEqual(requests.at(-1), { path: '/api/v1/players/1/kill-god-title/claim', key: 'title-claim-event' });
  }
});
