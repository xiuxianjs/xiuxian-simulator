import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { build } from 'esbuild';


const state = globalThis.__meridianPhasePresentation = { sent: [], payload: null };
const framework = createPresentationHarness(state);
const bundled = await build({
  stdin: { contents: "export {default as view} from './src/response/meditation/meridian/res.ts'; export {default as pulse} from './src/response/meditation/pulse/res.ts';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'meridian-phase-seams', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(response\/(finalBusiness|config)|utils\/useMessage|api)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `
      export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
      export const loadFinalBusiness=async(e,next,op,args,parse)=>({handled:false,load:async()=>parse(globalThis.__meridianPhasePresentation.payload)});
      export { useMessage } from 'alemonjs';
      export const createBackendRequestContext=()=>({requestId:'phase-test',idempotencyKey:'phase-test'});
      export const getBackendMeridians=async()=>{throw new Error('unexpected second request')};
      export const pulseBackendMeridian=getBackendMeridians;
      export const requestBackend=getBackendMeridians;
      export const writeContext=()=>({});
      export class BackendAPIError extends Error {}
    ` }));
  } }]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const output = goTestFixture(['test', './internal/service', '-run', '^TestMeridianActualResponseContract$', '-count=1', '-v'], {
  cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024
});
const match = output.match(/MERIDIAN_ACTUAL_RESPONSE_FIXTURES=(.+)/);
assert.ok(match);
const fixtures = JSON.parse(match[1]);

async function render(kind, payload, isPrivate) {
  Object.assign(state, { payload, sent: [] });
  const event = { name: 'message.create', UserId: 'player', uid: 1, MessageText: kind === 'view' ? '/经络' : '/冲脉', isPrivate };
  await framework.run(handlers[kind], event, () => {});
  assert.equal(state.sent.length, 1);
  return JSON.stringify(state.sent[0]);
}

test('phase2 bubble uses server ordinal, both phase counts, cumulative total and VIP base quota', async () => {
  for (const isPrivate of [false, true]) {
    const text = await render('view', fixtures['view:phase2'], isPrivate);
    assert.ok(text.includes('经络 · 第2期 淬脉'));
    assert.ok(text.includes('1/20'));
    assert.ok(!text.includes('按每次正常进度'));
    if (fixtures['view:phase2'].current.Description) assert.ok(text.includes('淬脉加成：'));
    assert.equal((text.match(/\"data\":\"\/冲脉\"/g) ?? []).length, 1);
    assert.ok(text.includes('第2期 淬脉 0/20'));
    assert.ok(text.includes('第1期 贯通 20/20'));
    assert.ok(text.includes('基础 4/7'));
    assert.ok(text.includes('/服用 真灵丹 1'));
  }
});

test('committed second-phase receipt names the phase and all-complete view removes pulse actions', async () => {
  const text = await render('pulse', fixtures['pulse:phase2'], true);
  assert.ok(text.includes('进度：'));
  assert.ok(text.includes('第2期 淬脉'));
  const done = await render('view', fixtures['view:complete'], true);
  assert.ok(done.includes('已开放经脉全部圆满'));
  assert.ok(!done.includes('/冲脉'));
});
