import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__soulUpgrade={sent:[],calls:[],next:0,legacyCalls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`export {default as current} from './src/response/soulArtifact/upgrade/res.ts';export {default as original} from 'old-upgrade';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'batch-learn',setup(b){
 b.onResolve({filter:/^old-upgrade$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL('./fixtures/soul-upgrade-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^(\.\/client|@src\/api\/bot\/client)$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const withBackendRepeatDetection=async(b,u,c,m)=>m+(globalThis.__soulUpgrade.row.repeatSuffix?'\\n\\n'+globalThis.__soulUpgrade.row.repeatSuffix:'');export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export class BackendAPIError extends Error {}
 export const requestBackend=async()=>{const s=globalThis.__soulUpgrade;if(s.kind!=='original')throw new Error('supplementary API');s.legacyCalls++;if(s.row.status===0)throw new Error(s.row.feedback);if(s.row.status!==200)throw new BackendAPIError(s.row.v1.error.message);return s.row.v1.data};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__soulUpgrade;s.calls.push({op,args});if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSoulUpgrade','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
const rows=[...output.matchAll(/ROBOT_SOUL_UPGRADE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,235);
async function run(kind,row,isPrivate){Object.assign(state,{kind,row,sent:[],calls:[],next:0,legacyCalls:0});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[kind], e, ()=>state.next++);return structuredClone(state.sent);}
const normalized = text => text.replace(/\s+/g, ' ').trim();
const upgradeCommands = ['/本命物升级', '/本命物升级 5', '/本命物升级 36'];

test('soul level upgrade retains facts and only offers another upgrade for a complete receipt', async () => {
  for (const row of rows.filter(item => item.state !== 'muted')) {
    for (const isPrivate of [false, true]) {
      const label = row.state + ' ' + row.text.slice(0, 80);
      const actual = bubbleSemantics(await run('current', row, isPrivate));
      assert.equal(state.legacyCalls, 0, label);
      assert.equal(state.next, 0, label);
      const match = row.text.trim().match(/^[!！/#＃]?本命物升级\s*(\d+)?$/);
      if (!match) {
        assert.deepEqual(state.calls, [], label);
        assert.ok(actual.text.includes('格式错误，请先核对本命物操作用法'), label);
        assert.ok(actual.commands.includes('/本命物信息'), label);
        continue;
      }
      assert.deepEqual(state.calls, [{op: 'soul-artifacts.upgrade', args: row.arguments}], label);
      if (!row.result.success) {
        const reply = row.result.middleware.replies.at(-1);
        assert.ok(actual.text.includes(normalized(reply.text)), label);
        assert.ok(actual.commands.includes('/本命物信息'), label);
        assert.ok(upgradeCommands.every(command => !actual.commands.includes(command)), label);
        continue;
      }
      const previous = bubbleSemantics(await run('original', row, isPrivate));
      assert.equal(state.legacyCalls, 1, label);
      const {message, result} = row.result.data;
      for (const text of [message, ...result.compareLines]) {
        assert.ok(actual.text.includes(normalized(text)), label);
        assert.ok(previous.text.includes(normalized(text)), label);
      }
      const complete = result.actualLevels >= Number(match[1] ?? 1);
      assert.ok(actual.commands.includes('/本命物信息'), label);
      assert.deepEqual(actual.commands.filter(command => upgradeCommands.includes(command)), complete ? [...upgradeCommands].sort() : [], label);
      assert.equal(actual.commands.includes('/储物袋 材料 其它'), !complete, label);
      if (!complete) assert.ok(actual.text.includes('本次未完成全部请求等级'), label);
    }
  }
});

test('middleware advances next and uncertain responses show recovery without another request', async () => {
  for (const row of rows.filter(item => item.state === 'muted')) {
    await run('current', row, false);
    assert.equal(state.calls.length, 1);
    assert.equal(state.next, 1);
    assert.equal(state.sent.length, 0);
  }
  try {
    for (const transport of [false, true]) {
      state.transport = transport;
      const actual = bubbleSemantics(await run('current', {text: '/本命物升级', result: {success: true, branch: 'business', data: {}}}, false));
      assert.equal(state.calls.length, 1);
      assert.equal(state.next, 0);
      assert.equal(state.legacyCalls, 0);
      assert.equal(state.sent.length, 1);
      assert.ok(actual.text.includes('本命物培养结果未获完整确认'));
      assert.ok(actual.commands.includes('/本命物信息'));
      assert.ok(upgradeCommands.every(command => !actual.commands.includes(command)));
    }
  } finally {
    state.transport = false;
  }
});
