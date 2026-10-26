import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';


const state = globalThis.__meditationErrors = { sent: [], calls: [], failure: null };
const framework = createPresentationHarness(state);
const mocks = new Set(['@src/api', '@src/api/bot/meditation', '@src/utils/useMessage', '@src/response/config', './robotBusiness']);
const built = await build({
  stdin: { contents: `export {default as start} from './src/response/meditation/start/res.ts';
    export {default as end} from './src/response/meditation/end/res.ts';
    export {BackendAPIError} from './src/api/bot/client.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'meditation-errors', setup(b) {
    b.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    b.onResolve({ filter: /.*/ }, a => mocks.has(a.path) ? { path: a.path, namespace: 'seam' } : undefined);
    b.onResolve({ filter: /^[^./]/ }, a => a.path.startsWith('@src/') ? undefined : ({ path: import.meta.resolve(a.path), external: true }));
    b.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `
      const s=globalThis.__meditationErrors;
      export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
      export const createBackendRequestContext=()=>({requestId:'request-fixture'});
      export const parseMeditationStart=x=>x,parseMeditationEnd=x=>x,parseMeditationBoostOptions=x=>x;
      export const startBackendMeditation=()=>{throw Error('unexpected duplicate start')};
      export const settleBackendMeditation=()=>{throw Error('unexpected duplicate settlement')};
      export { useMessage } from 'alemonjs';
      export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{
        s.calls.push({op,args});
        if(s.refusal){await feedback(s.refusal);return {handled:true};}
        if(s.failure)throw s.failure;
        return {handled:false,data:decode(s.data)};
      };
    ` }));
  } }]
});
const h = await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
async function invoke(command, isPrivate, failure) {
  state.sent=[]; state.calls=[]; state.failure=failure;
  const event={name:'message.create',UserId:'player',uid:1,MessageText:command,isPrivate};
  await framework.run(h[command==='/出关'?'end':'start'], event, ()=>{throw Error('unexpected parent delegation')});
  assert.equal(state.calls.length,1,'must not repeat the business request');
  assert.equal(state.sent.length,1,'must await exactly one player reply');
  return JSON.stringify(state.sent[0]);
}
function backendError(message,code,status) {
  const error=new h.BackendAPIError(message,code,status,'backend-request');
  error.stack='BackendAPIError: test fixture';
  return error;
}
for(const command of ['/闭关','/闭关 灵石 8','/闭关加速','/出关']) {
  for(const isPrivate of [true,false]) {
    test(`${command} sends a 409 business conflict to the player (${isPrivate?'private':'group'})`,async()=>{
      const reason='灵石加速记录与本轮闭关不一致，请先处理原记录';
      const text=await invoke(command,isPrivate,backendError(reason,'CONFLICT',409));
      assert.ok(text.includes(reason));
      assert.equal(state.calls[0].op,command==='/出关'?'meditation.end':(command==='/闭关加速'||command==='/闭关 灵石 8')?'meditation.boost-options':'meditation.start');
    });
  }
}
test('other controlled refusals are visible; transport and internal details stay out of player replies',async()=>{
  for(const command of ['/闭关','/闭关加速','/出关']) {
    for(const [code,status] of [['BAD_REQUEST',400],['FORBIDDEN',403],['UNPROCESSABLE_ENTITY',422]]) {
      assert.ok((await invoke(command,true,backendError('当前无法闭关',code,status))).includes('当前无法闭关'));
    }
    for(const error of [backendError('internal SQL detail','INTERNAL',500),backendError('private network address','SDK_NETWORK_ERROR'),new Error('decode secret')]) {
      error.stack='test fixture';
      const text=await invoke(command,true,error);
      assert.ok(text.includes('服务暂时不可用，请稍后再试'));
      assert.ok(!text.includes(error.message));
    }
  }
});
test('ordinary backend refusal still sends once through the original bubble',async()=>{
  state.refusal={title:'闭关修炼',text:'灵石不足',buttons:[]};
  try {assert.ok((await invoke('/闭关 灵石 8',true,null)).includes('灵石不足'));}
  finally {delete state.refusal;}
});
