import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import axios from 'axios';
import { Router, shutdownLogger } from 'alemonjs';

const state = globalThis.__legacyArchiveTest = { config: {}, sent: [], calls: [] };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { resolveDir: process.cwd(), contents: `
    export * from './src/api/bot/legacy-archive.ts';
    export * from './src/response-apps/legacyArchive/app.ts';
    export { default as handler } from './src/response/legacyArchive/res.ts';
  ` },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'test-seams', setup(b) {
    for (const name of ['axios', 'alemonjs']) {
      b.onResolve({ filter: new RegExp(`^${name}$`) }, () => ({ path: pathToFileURL(resolve(`node_modules/${name}/${name === 'axios' ? 'index.js' : 'lib/index.js'}`)).href, external: true }));
    }
    b.onResolve({ filter: /utils\/appConfig$|^@src\/utils\/useMessage$|^@src\/response\/config$/ }, a => ({ path: a.path, namespace: 'seam' }));
    b.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `
      export const getAppConfig = () => globalThis.__legacyArchiveTest.config;
      export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
      export { useMessage } from 'alemonjs';
    ` }));
  } }]
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const originalAdapter = axios.defaults.adapter;
after(async () => { axios.defaults.adapter = originalAdapter; await shutdownLogger(); });
const token = 'archive-test-token-'.repeat(3);
const big = '900719925474099312345';
function setup(status = 200, body) {
  state.config = { legacy: { bot_token: token } };
  state.calls = [];
  state.sent = [];
  axios.defaults.adapter = async config => {
    state.calls.push(config);
    const uid = decodeURIComponent(new URL(config.url).pathname.split('/')[4]);
    const section = new URL(config.url).pathname.split('/')[5];
    const data = section === 'profile' ? { uid, name: '旧道友', autograph: '故人如梦', battle_power: big, constitution: null, talents: [] }
      : section === 'levels' ? { items: [{ type: 1, realm: 2, experience: big, definition: { name: '炼气二层' } }] }
      : { items: [{ name: '旧物', count: big, goods: null }], total: 6, page: 1, pageSize: 5 };
    return { status, data: body ?? { uid, data }, statusText: '', headers: {}, config };
  };
}
async function render(command, isPrivate = true) {
  const e = { UserId: 'platform', MessageText: command, isPrivate, name: isPrivate ? 'private.message.create' : 'message.create' };
  await framework.run(api.handler, e, () => {});
  return JSON.stringify(state.sent);
}

test('legacy command aliases preserve old UID and reject invalid arguments', () => {
  assert.deepEqual(api.parseLegacyCommand('/继承', 'old'), { uid: 'old', section: '资料', page: 1 });
  assert.deepEqual(api.parseLegacyCommand('/前世 财富', 'old'), { uid: 'old', section: '财富', page: 1 });
  assert.deepEqual(api.parseLegacyCommand('/继承 900719925474099312345 装备 2', 'new'), { uid: big, section: '装备', page: 2 });
  for (const command of ['/前世 ../admin', '/继承 old 装备 0', '/前世 old 装备 1000001', '/前世 old 装备 1 extra', '/前世 old 不存在', '/前世其他']) {
    assert.throws(() => api.parseLegacyCommand(command, 'old'));
  }
  const source = readFileSync('src/router.ts', 'utf8');
  assert.ok(source.includes("publicXiuxian.use(['继承', '前世']"));
  const router = Router.create({ events: ['message.create'], routeText: { prefixes: ['/'], stripPrefix: true, allowBare: true } });
  router.use(['继承', '前世'], async () => ({}));
  for (const command of ['/继承', '/前世 old 装备 2']) assert.equal(router.match({ name: 'message.create', MessageText: command }).matched, true);
  assert.equal(router.match({ name: 'message.create', MessageText: '/前世其他' }).matched, false);
});

test('old archive HTTP contract uses GET, isolated token, original UID, and safe errors', async () => {
  setup();
  await api.getLegacyArchive(big, '资料');
  const [request] = state.calls;
  assert.equal(request.method, 'get');
  assert.equal(request.url, `https://tatian-v2.alemonjs.com/api/legacy/players/${big}/profile`);
  assert.equal(request.headers.get('Authorization'), `Bearer ${token}`);
  assert.equal(request.headers.get('X-User-Id'), undefined);
  assert.equal(request.maxRedirects, 0);
  for (const status of [401, 404, 500, 302]) {
    setup(status);
    await assert.rejects(api.getLegacyArchive('old', '资料'), e => !e.message.includes(token));
  }
  for (const body of [{ uid: 'wrong', data: {} }, { uid: 'old', data: null }, { uid: 'old', data: [] }]) {
    setup(200, body);
    await assert.rejects(api.getLegacyArchive('old', '资料'), /不完整/);
  }
  setup(); state.config = {};
  await assert.rejects(api.getLegacyArchive('old', '资料'), /配置/);
  assert.equal(state.calls.length, 0);
  setup(); axios.defaults.adapter = async () => { throw new Error(token); };
  await assert.rejects(api.getLegacyArchive('old', '资料'), e => !e.message.includes(token));
});

test('native bubbles preserve large values, historical gaps, original UID buttons and pagination', async () => {
  for (const privateChat of [true, false]) {
    setup();
    const profile = await render('/继承 old', privateChat);
    assert.ok(profile.includes(big));
    assert.ok(profile.includes('炼气二层'));
    assert.ok(profile.includes('未留存'));
    assert.ok(profile.includes('/前世 old 装备'));
    assert.equal(state.calls.length, 2);
    assert.equal(state.sent.length, 1);
    setup();
    const bag = await render('/前世 old 储物袋', privateChat);
    assert.ok(bag.includes(big));
    assert.ok(bag.includes('物品定义未留存'));
    assert.ok(bag.includes('/前世 old 储物袋 2'));
    setup(200, { uid: 'old', data: { items: [], page: 1, pageSize: 5, total: 0, capacity: null } });
    assert.ok((await render('/前世 old 储物袋', privateChat)).includes('没有留存记录'));
    setup(404);
    assert.ok((await render('/前世 old', privateChat)).includes('未找到'));
  }
  assert.equal(api.archiveText(big), big);
  assert.equal(api.archiveText(null), '未留存');
  assert.throws(() => api.archiveText(Number(big)), /无效/);
  assert.throws(() => api.archiveItems({ items: [null] }), /不完整/);
  assert.throws(() => api.archivePage({ page: 1, pageSize: 0, total: 1 }), /不完整/);
  axios.defaults.adapter = originalAdapter;
});
