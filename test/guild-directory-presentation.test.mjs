import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';


const state = globalThis.__guildDirectoryPresentation = { raw: null, sent: [], calls: 0 };
const framework = createPresentationHarness(state);
const bundle = await build({
  stdin: { contents: `export {default as home} from './src/response/guild/myGuild/res.ts';export {default as directory} from './src/response/guild/guildList/res.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'ranking-query-seam', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(utils\/useMessage|response\/config|response\/robotBusiness)$/ }, args => ({ path: args.path, namespace: 'seam' }));
    builder.onResolve({ filter: /^\.\/client$/ }, () => ({ path: 'client', namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const requestBackend=()=>{throw new Error('unexpected game API');};export const writeContext=()=>({});export { useMessage } from 'alemonjs';export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const state=globalThis.__guildDirectoryPresentation;state.calls++;if(state.transportError){throw new Error('网络超时');}if(state.failure){await feedback(state.raw);return {handled:true};}return {handled:false,data:decode(state.raw)};};` }));
  }}]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const flatten = nodes => nodes.flatMap(node => Array.isArray(node.value) ? flatten(node.value) : [node]);
async function render(name, text, raw, failure=false) {
  state.failure=failure;
  state.raw = raw; state.sent = []; state.calls = 0;
  const event = { name: 'message.create', UserId: 'player', MessageText: text, isPrivate: true, uid:1 };
  await framework.run(handlers[name], event, async () => { throw new Error('unexpected next'); });
  assert.equal(state.calls, 1); assert.equal(state.sent.length, name === 'directory' && raw.result === null ? 0 : name === 'directory' && raw.redirected ? 2 : 1);
  if (!state.sent.length) return [];
  return state.sent.flatMap(flatten);
}
const textOf = nodes => nodes.map(node => String(node.value ?? '')).join('');
const commands = nodes => nodes.filter(node => ['MD.button', 'Button'].includes(node.type)).map(node => node.options.data);



const output = goTestFixture(['test', './internal/httpapi', '-run', '^TestRobotBusinessGuildDirectoryProjectionCorrectionAndReplay$', '-v', '-count=1'], { cwd: fileURLToPath(new URL('../../xiuxian-game-server/', import.meta.url)), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const receipts = [...output.matchAll(/ROBOT_GUILD_DIRECTORY_RESPONSE=([^|]+)\|([^|]+)\|(.+)/g)].map(m => ({ op: m[1], result: JSON.parse(m[3]).data }));
test('guild home keeps no-membership guidance, permission buttons and all original sections', async () => {
  for (const row of receipts.filter(r => r.op === 'guild.home')) {
    const raw = row.result.success ? row.result.data : row.result.middleware.replies.at(-1);
    for (const section of ['', ' 活动', ' 资料', ' 管理']) {
      const nodes = await render('home', '/我的宗门' + section, raw, !row.result.success), text = textOf(nodes), buttons = commands(nodes);
      if (!row.result.success) { assert.ok(text.includes(raw.text)); continue; }
      if (!raw.hasGuild) {
        assert.ok(text.includes('【寻觅宗门】')); assert.ok(text.includes('尚未加入宗门，先寻访同道。'));
        assert.ok(buttons.includes('/宗门列表')); assert.ok(buttons.includes('/我的申请'));
        assert.equal(buttons.includes('/创建宗门'), raw.access.canCreateOrApplyGuild); continue;
      }
      const leader = raw.membership.isLeader, manager = raw.membership.canUpgrade;
      if (section === ' 管理') {
        assert.equal(buttons.includes('/宗门审核'), manager);
        assert.equal(buttons.includes('/解散宗门'), leader);
        if (!manager) assert.ok(text.includes('宗门事务由宗主、副宗主与长老主持。'));
      } else if (section === ' 活动') {
        for (const command of ['/宗门主线', '/宗门大比', '/灵脉攻防战', '/宗门成员列表']) assert.ok(buttons.includes(command));
      } else {
        assert.ok(text.includes('灵石：1200/1000')); assert.ok(text.includes('声望：250/200'));
        assert.ok(text.includes('历史称号、当前称号'));
        if (!section) assert.equal(buttons.includes('/宗门审核'), manager);
        if (section === ' 资料') { assert.ok(buttons.includes('/退出宗门')); assert.ok(buttons.includes('/弹劾宗主')); }
      }
    }
  }
});
test('guild directory keeps active titles, default intro, eligibility and two overflow bubbles', async () => {
  for (const row of receipts.filter(r => r.op === 'guild.list')) {
    const raw = row.result.success ? row.result.data : row.result.middleware.replies.at(-1);
    const nodes = await render('directory', '/宗门列表 99', raw, !row.result.success), text = textOf(nodes), buttons = commands(nodes);
    if (!row.result.success) { assert.ok(text.includes(raw.text)); continue; }
    if (!raw.result) { assert.equal(state.sent.length, 0); continue; }
    assert.equal(buttons.includes('/创建宗门'), raw.canCreateOrApplyGuild);
    if (raw.result.total === 0) { assert.ok(text.includes('当前还没有任何宗门创建')); continue; }
    for (const guild of raw.result.guilds) {
      assert.ok(text.includes(`【${guild.id}】${guild.name}-1级-${guild.memberCount}人`));
      assert.ok(text.includes(`简介：${guild.name}，欢迎加入`));
      assert.equal(buttons.includes(`/加入宗门 ${guild.id}`), raw.canCreateOrApplyGuild);
    }
    assert.ok(!text.includes('历史称号')); assert.ok(buttons.includes('/我的申请'));
    if (raw.redirected) { assert.equal(state.sent.length, 2); assert.ok(text.includes('页码超出范围，已自动跳转到最后一页（第 2 页）')); }
  }
});
test('guild directory network errors end after one API attempt', async () => {
  state.transportError = true;
  try {
    const home = await render('home', '/我的宗门', {}); assert.ok(textOf(home).includes('网络超时'));
    const list = await render('directory', '/宗门列表 99', {}); assert.ok(textOf(list).includes('获取宗门列表失败，请稍后重试'));
  } finally { state.transportError = false; }
});
