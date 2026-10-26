import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';


const state = globalThis.__dailyFortuneEntry = { sent: [], calls: [], requests: [], data: {} };
const framework = createPresentationHarness(state, { capture: 'payload' });
const bundle = await build({
  stdin: { contents: "export {default as entry} from './src/response/dailyFortune/res.ts';export * from './src/api/bot/daily-fortune.ts';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'daily-fortune-seams', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^(axios|@src\/(utils\/(messageHelper|useMessage)|response\/(config|robotBusiness)))$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/(client|config)$/ }, args => args.importer.endsWith('/daily-fortune.ts') ? ({ path: args.path, namespace: 'seam' }) : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, args => {
      if (args.path === './client') return { resolveDir: process.cwd(), contents: `import { SDKError } from ${JSON.stringify(resolve('src/api/core/error.ts'))}; export class BackendAPIError extends SDKError { constructor(message,code,status){super(message,{code,status})} }` };
      return { contents: `
        export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
        export const getBackendConfig=()=>({url:'http://backend.test',workerToken:'fake-worker',timeoutMs:1000});
        export const FormatGui=p=>({...p,content:p.content.value});
        export { useMessage } from 'alemonjs';
        export const runRobotBusiness=async(event,operation,args,decode)=>{globalThis.__dailyFortuneEntry.calls.push({operation,args});return {handled:false,data:decode(globalThis.__dailyFortuneEntry.data)}};
        export default {post:async(...args)=>{globalThis.__dailyFortuneEntry.requests.push(args);return {data:{data:{enabled:true}}}}};
      ` };
    });
  } }]
});
const h = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const result = { date: '2026-10-19', poolVersion: 1, alreadyClaimed: false, tier: '元力机缘', spiritStone: 2000, spiritCrystal: 150, mentalPills: 1, qiPills: 2 };
function event(text, extra = {}) {
  return { name: 'message.create', Platform: 'qq-bot', BotId: 'bot', UserId: 'player', IsMaster: false, MessageText: text, isPrivate: false, Target: { scope: 'group', BotId: 'bot', targetId: 'official' }, ...extra };
}
async function render(text, extra = {}, data = result) {
  state.sent = []; state.calls = []; state.requests = []; state.data = data;
  const e = event(text, extra);
  await framework.run(h.entry, e, () => {});
  return state.sent[0];
}
function buttons(value) {
  if (!value || typeof value !== 'object') return [];
  return [...(value.type === 'MD.button' ? [value] : []), ...Object.values(value).flatMap(buttons)];
}
test('only the native master can enable; button remains inside the completed quote', async () => {
  let page = await render('/开启每日机缘');
  assert.equal(state.requests.length, 0);
  assert.match(JSON.stringify(page), /仅机器人 master/);
  page = await render('/开启每日机缘', { IsMaster: true });
  assert.equal(state.requests.length, 1);
  assert.equal(state.requests[0][1].enabled, true);
  assert.equal(state.requests[0][1].target.targetId, 'official');
  assert.equal(state.calls.length, 0);
  const quote = JSON.stringify(page.content);
  assert.match(quote, /本群已开启/);
  assert.equal(buttons(page.content).filter(x => x.options.data === '/每日机缘').length, 1);
  assert.match(quote, /MD.blockquote/);
});
test('master disable sends false and does not offer a draw', async () => {
  const page = await render('/关闭每日机缘', { IsMaster: true });
  assert.equal(state.requests[0][1].enabled, false);
  assert.equal(buttons(page.content).length, 0);
});
test('private events cannot configure or claim even when marked master', async () => {
  for (const text of ['/开启每日机缘', '/每日机缘']) {
    const page = await render(text, { IsMaster: true, name: 'private.message.create', Target: { scope: 'c2c', BotId: 'bot', targetId: 'player' } });
    assert.equal(state.requests.length, 0);
    assert.equal(state.calls.length, 0);
    assert.match(JSON.stringify(page), /仅限群内/);
  }
});
test('claim shows all four server rewards with the correct pill emphasis', async () => {
  const page = await render('/每日机缘');
  assert.equal(state.calls[0].operation, 'daily-fortune.claim');
  assert.equal(state.calls[0].args.target.targetId, 'official');
  const shown = JSON.stringify(page);
  for (const text of ['元力丹尤为丰厚', '精力丹 ×1', '元力丹 ×2', '灵石 ×2000', '灵晶 ×150']) assert.ok(shown.includes(text));
  assert.equal(buttons(page.content).length, 0);
});
test('repeat displays persisted rewards without another draw button', async () => {
  const page = await render('/每日机缘', {}, { ...result, alreadyClaimed: true });
  assert.match(JSON.stringify(page), /不会重复发奖/);
  assert.equal(buttons(page.content).length, 0);
});
test('invalid server results are rejected instead of inventing fallback rewards', () => {
  for (const bad of [null, {}, { ...result, mentalPills: 0 }, { ...result, qiPills: 1.2 }, { ...result, date: 'bad' }]) {
    assert.throws(() => h.parseDailyFortune(bad));
  }
});
