import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { createTestApp, inspectMessage } from 'alemonjs/testing';
import { createMarkdownText } from '../../node_modules/@alemonjs/qq-bot/lib/format.js';
import router, { matchesGameCommand } from '../../src/router';
import { alchemyRoutes, normalizeAlchemyCommand } from '../../src/response/alchemy/v2/commands';
import { startFeatureVisibility } from '../../src/utils/featureVisibility';
import { goTestFixture } from '../helpers/go-fixture.mjs';

const backend = fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url));

test('全部炼丹旧入口匹配真实路由并统一参数', () => {
  const args: Record<string, string> = { 丹方详情: ' 1', 丹方列表: ' 2', 查看丹方: ' 2', 丹方: ' 2', 炼制: ' 聚灵丹 10', 一键炼丹: ' 聚灵丹 10 选择' };
  for (const name of alchemyRoutes) {
    for (const prefix of ['', '/', '#', '＃']) {
      const text = prefix + name + (args[name] ?? '');
      assert.ok(matchesGameCommand({ name: 'message.create', MessageText: text }), `missing route ${text}`);
      assert.ok(matchesGameCommand({ name: 'private.message.create', MessageText: text }), `missing private route ${text}`);
      assert.match(normalizeAlchemyCommand(text), /^\/?炼丹(?:\s|$)/);
    }
  }
  assert.equal(normalizeAlchemyCommand('/丹方 2'), '/炼丹 丹方 2');
  assert.equal(normalizeAlchemyCommand('/丹方详情 7'), '/炼丹 预览 7 1');
  assert.equal(normalizeAlchemyCommand('/一键炼丹 聚灵丹 100 选择'), '/炼丹 炼制 聚灵丹 100 选择');
});

test('真实机器人路由到Go事务：炼丹、重放、天工领取兑换升级及翻页', { timeout: 120000 }, async t => {
  goTestFixture(['test', './internal/httpapi', '-run', '^TestAlchemyV2RobotIntentRejectsActorAndMalformed$', '-count=1'], { cwd: backend, encoding: 'utf8' });
  const scratch = mkdtempSync(join(tmpdir(), 'alchemy-robot-workflow-'));
  const addressFile = join(scratch, 'address');
  const binary = process.env.XIUXIAN_HTTPAPI_TEST_BINARY;
  const child = spawn(binary ?? 'go', binary ? ['-test.run=^TestAlchemyV2RobotWorkflowFixture$', '-test.v'] : ['test', './internal/httpapi', '-run', '^TestAlchemyV2RobotWorkflowFixture$', '-v', '-count=1'], {
    cwd: backend, env: { ...process.env, ALCHEMY_V2_ROBOT_FIXTURE_ADDR_FILE: addressFile }, stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';
  child.stdout.on('data', chunk => { logs += String(chunk); });
  child.stderr.on('data', chunk => { logs += String(chunk); });
  const exited = once(child, 'exit');
  let app: ReturnType<typeof createTestApp> | undefined;
  t.after(async () => {
    try { t.mock.timers.reset(); await app?.dispose(); } finally {
      writeFileSync(addressFile + '.stop', 'stop');
      const [code] = await exited;
      rmSync(scratch, { recursive: true, force: true });
      await shutdownLogger();
      assert.equal(code, 0, logs);
    }
  });
  const deadline = Date.now() + 30000;
  while (!existsSync(addressFile) && Date.now() < deadline && child.exitCode === null) await delay(25);
  assert.ok(existsSync(addressFile), logs || 'Go fixture did not start');
  const url = readFileSync(addressFile, 'utf8');
  t.mock.timers.enable({ apis: ['setTimeout'] });
  app = createTestApp({ config: { processor: { repeated_user_time: 0 }, 'xiuxian-game': { backend: { api_url: url, robot_auth_token: 'local-fixture-token' } } } });
  await app.mount({ responseRouter: router });
  await app.invoke(app.events.privateMessage({ userId: 'v2-one', platform: 'qq-bot' }), startFeatureVisibility);
  const audit = async () => (await (await fetch(url + '/__alchemy_audit')).json()) as { material: number; pills: number; spiritStone: number; crafts: number; level: number; exp: number };
  const run = async (text: string, privateChat = true, userId = 'v2-one') => {
    const event = privateChat ? app!.events.privateMessage({ text, userId, platform: 'qq-bot' }) : app!.events.groupMessage({ text, userId, platform: 'qq-bot' });
    const result = await app!.dispatch(event);
    assert.equal(result.messages.length, 1, `${text}: ${JSON.stringify(result.actions)}\n${logs}`);
    const message = result.messages[0];
    assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
    const nodes = message.nodes.flatMap(node => node.type === 'Markdown' ? node.value : []);
    const markup = createMarkdownText(nodes);
    assert.doesNotMatch(markup, /<qqbot-cmd-enter\b/, `${text}: unsupported enter tag must not be sent`);
    for (const [, command] of markup.matchAll(/<qqbot-cmd-input text="([^"]*)"/g)) {
      assert.ok(Buffer.byteLength(command, 'utf8') <= 100, `${text}: QQ command exceeds 100 bytes: ${command}`);
    }

    return { ...message, markup, nodes };
  };
  const quotes = (message: Awaited<ReturnType<typeof run>>) => message.nodes.filter(node => node.type === 'MD.blockquote').map(node => {
    assert.ok(node.type === 'MD.blockquote' && Array.isArray(node.value));
    return inspectMessage([{ type: 'Markdown', value: node.value }]);
  });
  const allTools = async () => {
    const list: ReturnType<typeof quotes> = [];
    for (let page = 1; page <= 5; page++) {
      const message = await run(`/炼丹 天工 ${page}`);
      list.push(...quotes(message));
      if (!message.commands.includes(`/炼丹 天工 ${page + 1}`)) return list;
    }
    throw new Error('tool pages did not terminate');
  };
  // Every legacy root is actually dispatched, not just matched in a small fake router.
  for (const name of alchemyRoutes.filter(name => name !== '丹方详情' && name !== '炼制' && name !== '一键炼丹')) {
    const result = await run('/' + name);
    assert.doesNotMatch(result.text, /指令无效|请使用 \/炼丹|获取.*失败/);
  }
  assert.equal((await audit()).crafts, 0, 'navigation and enrollment must not craft');
  const first = await run('/丹方', false);
  assert.match(first.text, /第1\/2页/);
  const second = await run('/炼丹 丹方 2');
  assert.match(second.text, /第2\/2页/);
  assert.ok(second.commands.includes('/炼丹 丹方 1'));
  assert.match(second.markup, /qqbot-cmd-input text="\/炼丹 丹方 1"/);
  const recipeCommand = first.commands.find(command => command === '/炼丹 预览 1 1');
  assert.ok(recipeCommand, 'recipe action missing after real startup visibility filter');
  assert.match(first.markup, /qqbot-cmd-input text="\/炼丹 预览 1 1"/);
  const preview = await run(recipeCommand);
  assert.match(preview.text, /成丹率 100.00%/);
  const confirm = preview.commands.find(command => command.startsWith('/炼丹 确认 '));
  assert.ok(confirm);
  assert.equal((await audit()).material, 200, 'preview consumed material');
  const made = await run(confirm, false);
  assert.match(made.text, /炼制1炉，成功1炉，失败0炉/);
  assert.match(made.text, /本次消耗/);
  assert.ok(made.commands.includes('/储物袋 道具 丹药'));
  assert.ok(made.commands.includes('/物品详情 聚灵丹'));
  const replay = await run(confirm);
  assert.match(replay.text, /未再次扣料/);
  assert.deepEqual(await audit(), { material: 198, pills: 1, spiritStone: 2000, crafts: 1, level: 2, exp: 0 });
  const foreign = await run(confirm, true, 'v2-two');
  assert.match(foreign.text, /确认内容无效/);
  const missing = await run('/炼丹 预览 1 0');
  assert.match(missing.text, /参数无效/);
  const owned = await run('/炼丹 天工');
  assert.ok(owned.commands.includes('/炼丹 天工 2'));
  assert.ok((await run('/炼丹 天工 2')).commands.includes('/炼丹 天工 1'));
  const unEquip = owned.commands.find(command => command.startsWith('/炼丹 卸下 '));
  assert.ok(unEquip);
  await run(unEquip);
  const blocked = await run('/炼丹 预览 1 1');
  assert.match(blocked.text, /单炉需/);
  assert.ok(blocked.commands.includes('/储物袋 材料 草药'));
  assert.ok(!blocked.commands.some(command => command.startsWith('/炼丹 确认 ')), 'missing equipment must block craft');
  await run(unEquip.replace('卸下', '装备'));
  const sources = await run('/炼丹 来源');
  assert.ok(sources.commands.includes('/炼丹 来源 2'), sources.text + JSON.stringify(sources.commands));
  const source2 = await run('/炼丹 来源 2');
  assert.ok(source2.commands.includes('/炼丹 来源 1'));
  const cash = quotes(sources).find(quote => quote.text.includes('目标火'))?.commands.find(command => command.startsWith('/炼丹 确认 '));
  assert.ok(cash);
  const claimed = await run(cash);
  assert.ok(claimed.commands.includes('/炼丹 预览 1 1'));
  await run(cash);
  assert.equal((await audit()).spiritStone, 1200, 'cash replay spent twice');
  const milestone = quotes(sources).find(quote => quote.text.includes('验收火3'))?.commands.find(command => command.startsWith('/炼丹 确认 '));
  assert.ok(milestone);
  await run(milestone); await run(milestone);
  assert.equal((await audit()).spiritStone, 1200, 'milestone consumed cash');
  const oldFurnace = (await allTools()).find(quote => quote.text.includes('青纹鼎'))?.commands[0];
  assert.ok(oldFurnace && oldFurnace.startsWith('/炼丹 卸下 '));
  await run(oldFurnace);
  const upgradeQuote = quotes(await run('/炼丹 来源 2')).find(quote => quote.text.includes('验收进阶炉'));
  assert.ok(upgradeQuote);
  const upgrade = upgradeQuote.commands.at(-1);
  assert.ok(upgrade && upgrade.startsWith('/炼丹 确认 '));
  await run(upgrade); await run(upgrade);
  assert.equal((await audit()).spiritStone, 1100, 'upgrade replay spent twice');
  const tools = await allTools();
  const newFurnace = tools.find(quote => quote.text.includes('验收进阶炉'))?.commands[0];
  assert.ok(newFurnace && newFurnace.startsWith('/炼丹 装备 '));
  const equipped = await run(newFurnace);
  assert.ok(equipped.commands.includes('/炼丹 预览 1 1'));
  const comparison = await run('/炼丹 对比 1');
  assert.match(comparison.text, /当前所选丹方成丹率：100.00%/);
  assert.ok(comparison.commands.includes('/炼丹 预览 1 1'));
  assert.ok(comparison.commands.includes('/炼丹 对比 1 2'));
  assert.ok((await run('/炼丹 对比 1 2')).commands.includes('/炼丹 对比 1 1'));
  for (const text of ['/丹方详情 1', '/炼制 聚灵丹', '/一键炼丹 聚灵丹 10 选择']) {
    assert.match((await run(text)).text, /聚灵丹 · 请求\d+炉/);
  }
  assert.equal((await audit()).crafts, 1, 'old commands must open preview rather than charge');
  const beginner = await run('/加入炼丹师', false, 'v2-two');
  assert.match(beginner.text, /入门已完成/);
  const beginnerTools = await run('/炼丹 天工', true, 'v2-two');
  assert.equal(quotes(beginnerTools).length, 2, 'new player must receive one fire and one furnace');
  await run('/成为炼丹师', true, 'v2-two');
  assert.equal(quotes(await run('/炼丹 天工', true, 'v2-two')).length, 2, 'enrollment replay duplicated tools');
  for (const text of ['/丹师排行榜', '/炼丹师排行榜']) {
    const before = await audit();
    const ranking = await run(text, false);
    assert.match(ranking.text, /丹师排行榜/);
    assert.doesNotMatch(ranking.text, /查询丹师排行榜失败/);
    assert.deepEqual(await audit(), before, 'ranking changed alchemy assets');
  }


});
