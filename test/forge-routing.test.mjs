import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Router, shutdownLogger } from 'alemonjs';
import { after } from 'node:test';
import { createTestApp } from 'alemonjs/testing';
after(() => shutdownLogger());
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { forgeReadEntries, forgeReadRoutes } from '../src/response/profession/forge/commands.ts';

test('forge tool exits use the registered replacement route and real market command grammar', async () => {
  const source = readFileSync(new URL('../src/router.ts', import.meta.url), 'utf8');
  const path = source.match(/seclusion\.use\('([^']+)', \(\) => import\('@src\/response\/profession\/replaceEquip\/res'\)\)/)?.[1];
  assert.ok(path, 'read actual replacement route registration');
  const app = Router.create();
  const group = app.group({events: ['message.create'], routeText: {prefixes: ['/'], stripPrefix: true, allowBare: true}});
  group.use(path, async () => ({default: () => {}}));
  for (const text of ['/替换', '/替换 12']) assert.ok(app.match({name: 'message.create', MessageText: text}).matched, text);
  const toolSource = readFileSync(new URL('../src/response/profession/replaceEquip/res.ts', import.meta.url), 'utf8');
  assert.ok(toolSource.includes('command: `/替换 ${tool.id}`'));
  const output = await build({
    stdin: {resolveDir: process.cwd(), contents: "export {parseMarketCommand} from './src/response/market/command.ts'"},
    bundle: true, write: false, platform: 'node', format: 'esm', external: ['alemonjs']
  });
  const {parseMarketCommand} = await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
  const market = parseMarketCommand('/珍宝楼 筛选 天工 价格升序 1');
  assert.equal(market.mode, 'filter');
  assert.deepEqual(market.categoryKey, {type: 'profession_tool'});
  assert.equal(market.page, 1);
  assert.equal(market.missing, undefined);
  assert.equal(market.invalidText, undefined);
});

test('installed router matches production forge read declarations without list/detail collisions', async t => {
  const runtime = createTestApp();
  t.after(() => runtime.dispose());
  const events = ['message.create', 'private.message.create', 'interaction.create', 'private.interaction.create'];
  const app = Router.create();
  const group = app.group({ events, routeText: { prefixes: ['/', '#', '＃'], stripPrefix: true, allowBare: true } });
  let seen;
  const loader = async () => ({ default: event => { seen = event.__route; } });
  const entries = group.use([...forgeReadEntries], loader);
  const scopeId = entries[0].scopeId;
  for (const config of forgeReadRoutes) group.use(config, loader);
  for (const name of events) for (const prefix of ['/', '#', '＃', '']) {
    for (const [path, args] of [
      ['我的锻造', []], ['锻造指引', []],
      ['锻造图纸', ['2']], ['锻造图纸', ['考核', '2']], ['锻造图纸', ['可制作']],
      ['锻造图纸详情', ['4']], ['锻造图纸详情', ['4', '考核', '2']],
      ['锻造作品', ['2']], ['锻造作品详情', ['7', '2']],
      ['锻造委托', ['2']], ['锻造委托详情', ['9', '2']]
    ]) {
      const event = { name, MessageText: prefix + [path, ...args].join(' '), UserId: 'test' };
      seen = undefined;
      await runtime.invoke(event, () => app.handleScopeEvent(scopeId, event, () => {}));
      assert.ok(seen, JSON.stringify({ name, prefix, path }));
      assert.equal(seen.key, path);
      assert.deepEqual(seen.rawArgs, args);
    }
  }
  for (const text of ['/锻造委托详情其它 1 1', '/锻造作品详情其它 1 1']) {
    assert.equal(app.match({ name: 'message.create', MessageText: text }).matched, false);
  }
});
