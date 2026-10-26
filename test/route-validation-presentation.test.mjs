import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import { Format } from 'alemonjs';
const state=globalThis.__routeValidation={sent:[]};
const framework = createPresentationHarness(state);
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessSkillBatchLearnRouteValidationAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
const rows=[...output.matchAll(/ROBOT_ROUTE_VALIDATION=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,36);
// Use the installed framework's actual router implementation and its original
// schema through the public package export, with platform actions intercepted by createTestApp.
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {Router as OriginalRouter} from 'alemonjs';export {finishRobotBusiness} from './src/response/robotBusiness.ts';export {sendMiddlewareReply} from './src/response/middlewareReply.ts';`},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'validation',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:import.meta.resolve('alemonjs'),external:true}));
 b.onResolve({filter:/^@alemonjs\/qq-bot$/},()=>({path:import.meta.resolve('@alemonjs/qq-bot'),external:true}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|api\/bot\/(identity|robot-business)|response\/(config|mwFeatureTrack|mwBan))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/(mwFeatureTrack|mwBan)$/},a=>({path:a.path,namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`export default ()=>true;export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const isRobotPublicEntry=()=>false;export const seedEventBackendRobotIdentity=()=>{};export const requestRobotBusiness=()=>{throw new Error('unexpected API')};export { useMessage } from 'alemonjs';`}));
}}]});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const original=new h.OriginalRouter({events:['message.create','private.message.create']});
original.group({routeText:{prefixes:['/','#','＃','!','！'],stripPrefix:true,allowBare:true}}).use({path:'一键学习功法',schema:{args:[{name:'confirm',rules:[{type:'string'}]}]}},()=>{throw new Error('original invalid arguments reached business')});
async function old(event){
 const value=await original.define.current[0].handler();const handler=typeof value==='function'?value:value.current;
 await framework.invoke(event, ()=>handler(event,()=>{throw new Error('old next')}), ()=>{throw new Error('old validation called next')});
}
test('backend false feedback exactly preserves the original framework validation format',async()=>{
 for(const row of rows.filter(r=>!r.task))for(const name of ['message.create','private.message.create']) {
  const event={name,UserId:'player',MessageId:'validation',MessageText:row.text,Platform:'onebot'};
  state.sent=[];
  await old(event);const expected=structuredClone(state.sent);assert.equal(expected.length,1);
  state.sent=[];let next=0;
  await framework.invoke(event, ()=>h.finishRobotBusiness(event,row.result,()=>next++,()=>{throw new Error('raw reply entered business template')}), ()=>next++);
  assert.equal(next,0);assert.equal(event.__res,undefined);assert.deepEqual(state.sent,expected,row.text);
 }
});


test('all migrated schemas match actual original framework values, ordering and full messages',async()=>{
 const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotRouteSchemaOriginalValidatorParity$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:32*1024*1024});
 const matrix=[...output.matchAll(/ROBOT_SCHEMA_GATE=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(matrix.length,567);
 const fixtures=JSON.parse(readFileSync(new URL('./fixtures/router-validation-before-v2.json',import.meta.url),'utf8'));
 fixtures.push({path:'一键学习功法',schema:{args:[{name:'confirm',rules:[{type:'string'}]}]}});
 const oracle=new h.OriginalRouter({events:['message.create','private.message.create']});
 const group=oracle.group({routeText:{prefixes:['/','#','＃','!','！'],stripPrefix:true,allowBare:true}});
 for(const config of fixtures)group.use(config,async()=>({default:()=>{state.executed++}}));
 const value=await oracle.define.current[0].handler();const handler=typeof value==='function'?value:value.current;
 for(const row of matrix) {
  const event={name:'message.create',UserId:'player',MessageText:row.text,Platform:'onebot'};
  state.sent=[];state.executed=0;
  await framework.invoke(event, ()=>handler(event,()=>{throw new Error('oracle advanced')}), ()=>{throw new Error('oracle unmatched')});
  assert.equal(state.executed,row.valid?1:0,JSON.stringify([row.operation,row.input]));
  if(row.valid){assert.equal(state.sent.length,0);continue}
  const expected=structuredClone(state.sent);assert.equal(expected.length,1);
  state.sent=[];await framework.invoke(event, ()=>h.sendMiddlewareReply(event,row.reply,true), ()=>{});
  assert.deepEqual(state.sent,expected,JSON.stringify([row.operation,row.input]));
 }
});

test('command-only refusals preserve the plain validation format and end without custom business feedback or next',async()=>{
 const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessCommandOnlyRefusalTaskAndReplay$','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
 const cases=[...output.matchAll(/ROBOT_COMMAND_ONLY_REFUSAL=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(cases.length,84);
 for(const row of cases.filter(r=>!r.task&&!r.muted))for(const name of ['message.create','private.message.create']) {
  const event={name,UserId:'player',MessageText:'/'+row.input,Platform:'onebot'};
  const command=row.input.split(' ')[0];
  const expected=Format.createMarkdown().addText('我已经识别到你想用的是 `'+command+'`。').addNewline().addText('该指令不接受参数').addNewline().addText('你可以这样输入：`/'+command+'`');
  state.sent=[];let next=0;
  await framework.invoke(event, ()=>h.finishRobotBusiness(event,row.result,()=>next++,()=>{throw new Error('raw refusal entered business bubble')}), ()=>next++);
  assert.equal(next,0);assert.equal(event.__res,undefined);assert.equal(state.sent.length,1);assert.deepEqual(state.sent[0],Format.create().addMarkdown(expected).value);
 }
});
