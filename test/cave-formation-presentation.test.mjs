import { formationAdvice } from './helpers/formation-recovery-delta.mjs';
import { withoutExpectedAdvice } from './helpers/recovery-delta.mjs';
import { bubbleSemantics } from './helpers/bubble-semantics.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__formation={sent:[],calls:0};
const framework = createPresentationHarness(state);
const contents=['info','activate','remove'].map(k=>`export {default as ${k}} from './src/response/caveFormation/${k}/res.ts';export {default as old_${k}} from 'old-${k}';`).join('')+`export * from './src/api/bot/cave-formation-actions.ts';export * from './src/api/bot/cave-formation-queries.ts';`;
const bundle=await build({stdin:{contents,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'formation',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/cave-formation-${a.path}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src$|^@src\/api$|^@src\/(utils\/useMessage|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/api\/bot\/client$|^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export class BackendAPIError extends Error{constructor(message,code,status){super(message);this.code=code;this.status=status}};
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});
 export const requestBackend=async()=>{const s=globalThis.__formation;if(!s.kind.startsWith('old_'))throw new Error('supplementary HTTP');s.legacyCalls++;if(s.status!==200)throw new BackendAPIError(s.error.message,s.error.code,s.status);return s.originalData};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__formation;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');if(s.result.success&&s.result.branch==='middleware'){next();return{handled:true}}if(!s.result.success){await feedback(s.result.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(s.result.data)}};
 `}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessCaveFormationsV1LifecycleAndReadOnly$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
const rows=[...output.matchAll(/ROBOT_ALCHEMY_QUERY_RESPONSE=([^|]+)\|([^|]+)\|([^|]+)\|(.+)/g)].map(m=>({op:m[1],args:JSON.parse(m[2]),text:m[3],result:JSON.parse(m[4]).data}));assert.equal(rows.length,199);
const old=[...output.matchAll(/ROBOT_FORMATION_V1=([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],args:JSON.parse(m[2]),text:m[3],status:Number(m[4]),body:JSON.parse(m[5])}));assert.equal(old.length,196);
function handler(row){const k=row.op.split('.').at(-1);return k==='list'?'info':k;}
async function render(name,row,isPrivate){state.kind=name;state.sent=[];state.calls=0;state.next=0;state.legacyCalls=0;const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(h[name], e, ()=>state.next++);return state.sent;}
test('formation original success, error, usage and alias bubbles match in private/group',async()=>{
 for(let n=0;n<old.length;n++)for(const isPrivate of [true,false]){
  const row=rows[n],key=handler(row);if(key==='info'&&old[n].status!==200)continue;
  state.result=row.result;state.originalData=old[n].body.data;state.status=old[n].status;state.error=old[n].body.error;
  const actual=await render(key,row,isPrivate);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.deepEqual(state.args,row.args);assert.equal(actual.length,1);
  const expectedAdvice=!row.result.success?formationAdvice(row.op,row.result.middleware.replies.at(-1).text):key==='info'&&row.result.data.length===0?formationAdvice(row.op,'暂无生效中的洞府阵法'):[];
  const comparable=withoutExpectedAdvice(actual,expectedAdvice);const before=await render('old_'+key,row,isPrivate);
  if(row.args.keyword===''){const view=bubbleSemantics(actual);assert.ok(view.text.includes('用法：'));assert.ok(view.text.includes('示例：'));assert.ok(!view.commands.some(command=>/^\/(激活阵盘|移除阵法)(?:\s|$)/.test(command)));assert.deepEqual(bubbleSemantics(comparable),bubbleSemantics(before),old[n].state+row.text);assert.equal(state.legacyCalls,0);}
  else {assert.deepEqual(comparable,before,old[n].state+row.text);assert.equal(state.legacyCalls,1);}
 }
});
test('formation list faults return one feedback without supplementary HTTP',async()=>{
 for(let n=0;n<old.length;n++)if(handler(rows[n])==='info'&&old[n].status!==200){state.result=rows[n].result;const actual=await render('info',rows[n],false);const reason=rows[n].result.middleware.replies.at(-1).text;withoutExpectedAdvice(actual,formationAdvice(rows[n].op,reason));assert.ok(bubbleSemantics(actual).text.includes(reason));assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.equal(state.legacyCalls,0);}
});
test('all formation handlers use parent fallback and never supplement transport/DTO failures',async()=>{
 for(const [key,op] of [['info','list'],['activate','activate'],['remove','remove']]){
  const row=rows.find(r=>r.op==='cave-formations.'+op&&r.args.keyword!=='');state.result=rows.at(-1).result;
  await render(key,row,false);assert.equal(state.next,1);assert.equal(state.sent.length,0);assert.equal(state.calls,1);
  for(const transport of [true,false]){state.transport=transport;state.result={success:true,branch:'business',data:{}};await render(key,row,true);assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.sent.length,1);assert.equal(state.legacyCalls,0);}state.transport=false;
 }
 for(const value of [null,{},[{}]])assert.throws(()=>h.parseBackendCaveFormations(value));
 for(const value of [null,{}, {outcome:'created'}]){assert.throws(()=>h.parseBackendCaveFormationActivation(value));assert.throws(()=>h.parseBackendCaveFormationRemoval(value));}
});
