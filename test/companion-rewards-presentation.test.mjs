import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
// Run with node --test --test-force-exit: alemonjs retains runtime handles after rendering.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { build } from 'esbuild';


const state = globalThis.__companionRewards = { calls: 0, sent: [] };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as daily} from './src/response/companion/claimDaily/res.ts';export {default as month} from './src/response/companion/claimMonthCard/res.ts';export * from './src/api/bot/companion-rewards.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'companion-reward-seams', setup(b) {
    b.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    b.onResolve({ filter: /^(@src\/(utils\/useMessage|response\/(config|robotBusiness))|\.\/client)$/ }, a => ({ path: a.path, namespace: 'seam' }));
    b.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `
      export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
      export { useMessage } from 'alemonjs';
      export const requestBackend=()=>{throw new Error('unexpected supplementary API')};export const writeContext=()=>({});
      export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{
        const s=globalThis.__companionRewards;s.calls++;s.op=op;
        if(s.result.branch==='middleware'){next();return {handled:true}}
        if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return {handled:true}}
        return {handled:false,data:decode(s.result.data)};
      };
    ` }));
  } }]
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessCompanionRewards', '-v', '-count=1'], {
  cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024
});
const rows = [...output.matchAll(/ROBOT_COMPANION_REWARDS=([^|]+)\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));

test('real companion reward receipts render once in private and group, including duplicate and relationship refusals', async () => {
  assert.ok(rows.length >= 6);
  for (const row of rows) {
    for (const isPrivate of [true, false]) {
      state.calls = 0; state.sent = []; state.result = row.result;
      const event = { name: 'message.create', UserId: 'player', MessageText: row.op === 'companion.claim-daily' ? '/道侣签到' : '/道侣月卡', isPrivate };
      await framework.run(api[row.op === 'companion.claim-daily' ? 'daily' : 'month'], event, () => {});
      assert.equal(state.calls, 1);
      assert.equal(state.op, row.op);
      assert.equal(state.sent.length, 1);
      const rendered = JSON.stringify(state.sent[0]);
      assert.ok(rendered.includes('我的道侣'));
      if (row.result.success) {
        assert.ok(rendered.includes('奖励已发放至道侣账户'));
        assert.ok(rendered.includes('UID 2'));
        if (row.op === 'companion.claim-month-card') {
          assert.ok(rendered.includes('3 天月卡奖励'));
          assert.ok(rendered.includes('450'));
          assert.ok(rendered.includes('精力丹 ×6'));
          assert.ok(rendered.includes('元力丹 ×6'));
        }
      }
    }
  }
});

test('companion reward parsers reject missing recipients and malformed reward receipts', () => {
  for (const value of [null, {}, {partnerId: 2, partnerName: '乙'}, {partnerId: 0, partnerName: '乙', dailyCheckIn: {accumulatedDays: 1, issued: []}}]) {
    assert.throws(() => api.parseCompanionDailyReward(value));
    assert.throws(() => api.parseCompanionMonthCardReward(value));
  }
});
