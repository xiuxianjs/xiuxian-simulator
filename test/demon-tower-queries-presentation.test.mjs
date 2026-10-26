import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__demonTowerQueriesPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as info} from './src/response/demonTower/info/res.ts';export {default as ranking} from './src/response/demonTower/leaderboard/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__demonTowerQueriesPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw,1)};};` }));
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



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessDemonTowerQueriesV1ParityAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_DEMON_TOWER_QUERY_RESPONSE=([^|]+)\|player\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[2]).data }));


test('information preserves locked, fresh, pending buff, completed and reset bubbles',async()=>{
  const rows=receipts.filter(r=>r.op==='demon-tower.info'&&r.result.success);
  assert.equal(rows.length,5);
  for(const {result:row} of rows){
    const nodes=await render('info','/妖塔',row.data),raw=row.data.info;
    if(!raw){assert.ok(textOf(nodes).includes('筑基及以上方可开启妖塔'));assert.ok(commands(nodes).includes('/我的境界'));continue;}
    assert.ok(textOf(nodes).includes(!raw.hasStarted?'今日尚未开始闯塔':raw.isFinished?'今日闯塔已结束':'当前进度：'));
    assert.equal(commands(nodes).includes('/妖塔挑战 1'),raw.showChallengeButtons);
    assert.equal(commands(nodes).includes('/妖塔扫荡'),raw.showSweepButton);
    assert.equal(commands(nodes).includes('/妖塔重置'),raw.showResetButton);
    assert.ok(commands(nodes).includes('/妖塔排行榜'));
    if(raw.recordedLayers>0){assert.ok(textOf(nodes).includes(`历史累计最高星数：${raw.totalBestStars}🌟`));}
  }
});
test('ranking uses playerId directly and keeps self, nearby, empty and pagination states',async()=>{
  for(const {result:row} of receipts.filter(r=>r.op==='demon-tower.ranking'&&r.result.success)){
    for(const text of ['/妖塔排行榜 榜首','/妖塔排行榜 附近']){
      const nodes=await render('ranking',text,row.data),raw=row.data.leaderboard;
      assert.ok(textOf(nodes).includes(raw.self?`我的排名：第${raw.self.rank}名`:'尚无妖塔记录'));
      for(const item of (text.endsWith('附近')?raw.nearby:raw.list)){
        assert.ok(commands(nodes).includes(`/查看信息 ${item.playerId}`));
        if(item.playerId===1){assert.ok(textOf(nodes).includes('👈我'));assert.ok(!commands(nodes).includes('/点赞人气 1 demonTower'));}
      }
      if(!raw.list.length && !text.endsWith('附近')){assert.ok(textOf(nodes).includes('暂无排行数据'));}
    }
  }
});
