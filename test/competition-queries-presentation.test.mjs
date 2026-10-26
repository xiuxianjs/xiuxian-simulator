import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__competitionQueryPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as home} from './src/response/guildCompetition/home/res.ts';export {default as candidates} from './src/response/guildCompetition/challengeList/res.ts';export {default as promotion} from './src/response/guildCompetition/checkPromotionTeams/res.ts';export {default as bets} from './src/response/guildCompetition/checkBets/res.ts';export {default as battles} from './src/response/guildCompetition/battleLog/res.ts';export {default as detail} from './src/response/guildCompetition/battleDetail/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__competitionQueryPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
  }}]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(name, text, raw, failure=false) {
  state.failure=failure;
  state.raw = raw; state.sent = []; state.calls = 0;
  const event = { name: 'message.create', UserId: 'player', MessageText: text, isPrivate: true, uid:1 };
  await framework.run(handlers[name], event, async () => { throw new Error('unexpected next'); });
  assert.equal(state.calls, 1); assert.equal(state.sent.length, raw.outcome === 'no_match' ? 0 : 1);
  if (!state.sent.length) return [];
  return flatten(state.sent[0]);
}
const textOf = nodes => nodes.map(node => String(node.value ?? '')).join('');
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessCompetitionQueriesScopePhasesFailuresAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_COMPETITION_QUERY_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));

const rows = op => receipts.filter(r => r.op === `competition.${op}` && r.result.success).map(r => r.result.data);
test('competition home preserves schedule, no-guild state and phase-driven original actions', async () => {
  for (const data of rows('home')) {
    const nodes = await render('home', '/宗门大比', data), text = textOf(nodes), buttons = commands(nodes), v = data.view;
    assert.ok(text.includes(`当前阶段：${v.phaseName}`));
    for (const label of ['报名', '淘汰赛', '晋级赛', '结算']) assert.ok(text.includes(label));
    if (!data.hasGuild) {assert.ok(text.includes('你还未加入宗门'));continue;}
    if (data.previousSeason) {assert.ok(text.includes(`上一届（${data.previousSeason.competitionId}）：${data.previousSeason.message}`));assert.ok(text.includes('下一届赛程'));}
    assert.ok(text.includes(`${data.guildName}（等级${data.guildLevel}）`));
    assert.equal(buttons.includes('/宗门大比报名'), v.canApply);
    assert.equal(buttons.includes('/查看晋级赛队伍'), v.showPromotionTeams);
    assert.ok(buttons.includes('/宗门大比战斗记录 1')); assert.ok(buttons.includes('/查看押注记录'));
    if (v.showKnockout && data.knockoutInfo) assert.ok(text.includes(`当前积分：${data.knockoutInfo.score}，剩余挑战次数：${data.knockoutInfo.remain}`));
    if (v.showRoster && data.roster) {
      for (const slot of data.roster.slots.filter(Boolean)) {
        assert.ok(text.includes(`${slot.position} ${slot.name}`)); assert.ok(buttons.includes(`/查看信息 ${slot.userId}`));
        assert.equal(buttons.includes(`/调整宗门大比位置 ${slot.position} ${slot.position + 1}`), slot.canMoveDown);
      }
    }
  }
});
test('candidate list retains fixed display slots, empty state and challenge buttons in each quote', async () => {
  for (const data of rows('candidates')) {
    const nodes = await render('candidates', '/可挑战宗门列表', data), text = textOf(nodes), buttons = commands(nodes);
    assert.ok(text.includes(`当前积分：${data.score}，剩余挑战次数：${data.remaining}`));
    if (!data.candidates.length) assert.ok(text.includes('暂无可挑战宗门'));
    for (const c of data.candidates) {
      assert.ok(text.includes(`【${c.guildName}】`)); assert.ok(buttons.includes(`/挑战宗门 ${c.guildId}`));
      for (const slot of c.slots.filter(Boolean)) assert.ok(text.includes(`${slot.position}.${slot.name}`));
    }
  }
});
test('promotion teams retain rank order and original empty state', async () => {
  for (const data of rows('promotion-teams')) {
    const text = textOf(await render('promotion', '/查看晋级赛队伍', data));
    if (!data.teams.length) assert.ok(text.includes('暂无晋级赛队伍'));
    let index = -1;
    for (const team of data.teams) {const next = text.indexOf(`【${team.rank || '-'}】${team.guildName}`); assert.ok(next > index);index=next;}
  }
});
test('bets retain identity scope, empty state, amounts, odds and all original status labels', async () => {
  const statuses = ['未结算', '✅已中奖', '❌未中奖'];
  for (const data of rows('bets')) {
    const text = textOf(await render('bets', '/查看押注记录', data));
    if (!data.bets.length) assert.ok(text.includes('暂无押注记录'));
    for (const b of data.bets) {assert.ok(text.includes(`宗门ID:${b.guildId} | 押注:${b.betAmount} | 赔率:${b.odds.toFixed(2)}`));assert.ok(text.includes(`状态：${statuses[b.status] ?? `未知(${b.status})`}`));}
  }
});
test('battle records preserve membership, participation, empty/overflow states and five-row presentation', async () => {
  for (const data of rows('battles')) {
    const nodes = await render('battles', '/宗门大比战斗记录 1', data), text = textOf(nodes), buttons = commands(nodes);
    if (!data.hasGuild) {assert.ok(text.includes('你还未加入宗门'));continue;}
    if (!data.hasTeams) {assert.ok(text.includes('暂无宗门大比参赛记录'));continue;}
    if (!data.records.length) {assert.ok(text.includes('暂无战斗记录'));continue;}
    for (const r of data.records) {assert.ok(text.includes(`${r.isWin ? '✅' : '❌'} VS ${r.opponentName ?? `队伍${r.opponentTeamId}`}`));assert.ok(text.includes(r.stage === 1 ? '淘汰赛' : r.stage === 2 ? '晋级赛' : `未知(${r.stage})`));assert.ok(buttons.includes(`/宗门大比战斗详情 ${r.id}`));}
  }
});
test('battle details retain names, result, original list navigation and no invented memory link', async () => {
  for (const data of rows('battle-detail')) {
    const nodes = await render('detail', '/宗门大比战斗详情 1', data), text = textOf(nodes);
    for (const value of [`阶段：${data.stageName}`, `对阵：${data.attackerName} VS ${data.defenderName}`, `胜者：${data.winnerName}`]) assert.ok(text.includes(value));
    assert.ok(commands(nodes).includes('/宗门大比战斗记录 1'));
    assert.ok(!commands(nodes).some(c => c.startsWith('/查看战斗过程')));
  }
});
test('all six entries retain original failure behavior and stop after one transport attempt', async () => {
  const names = {home:'home', candidates:'candidates', 'promotion-teams':'promotion', bets:'bets', battles:'battles', 'battle-detail':'detail'};
  const command = name => name === 'battles' ? '/宗门大比战斗记录 1' : name === 'detail' ? '/宗门大比战斗详情 1' : '/宗门大比';
  for (const {op, result: row} of receipts.filter(r => !r.result.success)) {
    const name = names[op.slice('competition.'.length)], reply = row.middleware.replies.at(-1);
    assert.ok(textOf(await render(name, command(name), reply, true)).includes(name === 'bets' ? '暂无押注记录' : reply.text));
  }
  state.transportError = true;
  try {
    for (const name of Object.values(names)) assert.ok(textOf(await render(name, command(name), {})).includes(name === 'bets' ? '暂无押注记录' : '网络超时'));
  } finally {state.transportError=false;}
});
