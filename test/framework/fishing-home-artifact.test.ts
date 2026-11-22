import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ResultCode, shutdownLogger } from 'alemonjs';
import { inspectMessage } from 'alemonjs/testing';
import type { FishingView } from '../../src/api/bot/fishing';
import { goTestFixture } from '../helpers/go-fixture.mjs';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());

test('垂钓新旧服务端响应与本地构建产物配对', async t => {
  const scratchRoot = fileURLToPath(new URL('../../.tmp/', import.meta.url));
  mkdirSync(scratchRoot, { recursive: true });
  const scratch = mkdtempSync(join(scratchRoot, 'fishing-home-artifact-'));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  const current = join(scratch, 'current.json');
  goTestFixture(['test', './internal/service', '-run', '^TestFishingUnifiedHomeWire$', '-count=1'], {
    cwd: fileURLToPath(new URL('../../../xiuxian-game-server/', import.meta.url)),
    env: { ...process.env, FISHING_UNIFIED_HOME_WIRE_OUTPUT: current }
  });

  const output = join(scratch, 'lib');
  execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import { initConfig, getOptions, buildAndRun } from 'lvyjs';
    await initConfig();
    getOptions().build.dir = process.argv[1];
    await buildAndRun();
  `, output], { cwd: fileURLToPath(new URL('../../', import.meta.url)), maxBuffer: 8 * 1024 * 1024 });
  const { default: handler } = await import(pathToFileURL(join(output, 'response/fishing/res.js')).href);

  const legacy = new URL('../fixtures/fishing-home-unified-27f49a4c-actual.json', import.meta.url);
  for (const [layout, path, factCount] of [['旧版合并配置', legacy, 1], ['新版分块配置', current, 5]] as const) {
    const payloads = JSON.parse(readFileSync(path, 'utf8')) as Record<'withoutEncounter' | 'withEncounter', FishingView>;

    for (const scenario of ['withoutEncounter', 'withEncounter'] as const) {
      await t.test(`${layout} · ${scenario === 'withEncounter' ? '有龙鲤奇遇' : '无奇遇'}`, async subtest => {
        const payload = payloads[scenario];
        assert.equal(payload.status, 'home-unified');
        const facts = payload.sections.filter(section => !section.title);
        assert.equal(facts.length, factCount);
        assert.equal(facts.flatMap(section => section.actions).length, 5);
        const operation = payload.sections.find(section => section.title === '操作');
        assert.ok(operation);
        assert.equal(operation.actions.length, 7);
        const encounter = payload.sections.find(section => section.title === '上古龙鲤');
        const bossCommand = encounter?.actions[0].command;

        if (scenario === 'withEncounter') {
          assert.deepEqual(encounter?.actions.map(action => action.label), ['垂钓奇遇', '我的队伍']);
          assert.match(bossCommand ?? '', /^\/垂钓 奇遇 fb_[0-9a-f]{32}$/);
          assert.equal(encounter?.actions[1].command, '/我的队伍');
        } else {
          assert.equal(encounter, undefined);
        }

        const { app, requests } = await gameFixture(subtest, request => businessEnvelope(request.bid, payload));
        const result = await app.runHandler(handler, app.events.privateMessage({ text: '/垂钓', platform: 'qq-bot' }));
        assert.deepEqual(result.errors, []);
        assert.equal(requests.length, 1);
        assert.ok(requests[0].path.endsWith('/fishing.query'));
        assert.deepEqual(requests[0].body.arguments, { view: 'overview' });
        assert.equal(result.messages.length, 1);
        const message = result.messages[0];
        assert.equal(result.actions[message.actionIndex].results?.[0].code, ResultCode.Ok);
        const rendered = inspectMessage(message.nodes);
        assert.doesNotMatch(rendered.text, /查询未完成/);
        for (const { command } of operation.actions) {
          assert.ok(rendered.commands.includes(command), `缺少操作入口：${command}`);
        }
        assert.deepEqual(rendered.commands.filter(command => command.startsWith('/垂钓 奇遇 ')), bossCommand ? [bossCommand] : []);
      });
    }
  }
});
