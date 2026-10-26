import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import { logger } from 'alemonjs';
logger.error=()=>{};
const state=globalThis.__navigation={};
const framework = createPresentationHarness(state);
globalThis.__navigationError=class BackendAPIError extends Error {constructor(message,code,status){super(message);this.code=code;this.status=status}};
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessNavigation','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:64*1024*1024});
const rows=[...output.matchAll(/ROBOT_NAVIGATION=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,26);
async function load(flow){
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {default as current} from '${flow==='help'?'./src/response/help.ts':'./src/response/more/res.ts'}';export {default as old} from 'old-catalog';`},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'catalog',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^old-catalog$/},()=>({path:'old',namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},()=>({loader:'ts',contents:readFileSync(new URL(`./fixtures/navigation-${flow}-before-v2.ts.txt`,import.meta.url),'utf8'),resolveDir:resolve(flow==='help'?'src/response':'src/response/more')}));
 b.onResolve({filter:/^@src\/(utils\/useMessage|response\/(config|robotBusiness))$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^@src\/api$/},()=>({path:'api',namespace:'barrel'}));
 b.onLoad({filter:/.*/,namespace:'barrel'},()=>({resolveDir:process.cwd(),contents:`export {issueBackendLoginWindow} from ${JSON.stringify(resolve('src/api/bot/account.ts'))};export {createBackendRequestContext} from ${JSON.stringify(resolve('src/api/bot/context.ts'))};export {BackendAPIError} from ${JSON.stringify(resolve('src/api/bot/client.ts'))};`}));
 b.onResolve({filter:/^@src\/api\/bot\/identity$/},()=>({path:'identity',namespace:'seam'}));
 b.onResolve({filter:/^\.\/useMessage$/},()=>({path:'message',namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$|\/src\/api\/bot\/client\.ts$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
 export const getBackendRobotIdentity=async()=>({account:{status:'registered',playerId:1}});
 export const BackendAPIError=globalThis.__navigationError;
 export const writeContext=()=>({});
 export { useMessage } from 'alemonjs';
 export const requestBackend=async(bid,operation,args)=>{const s=globalThis.__navigation;s.legacy.push({operation,args});if(s.mode==='current')throw new Error('supplementary API');if(s.row.transport)throw new BackendAPIError('query failed','SDK_NETWORK_ERROR');if(operation==='get_robot_realm_access')return s.row.access;if(s.row.status!==200)throw new BackendAPIError(s.row.v1?.error?.message??'legacy error',s.row.v1?.error?.code??'SDK_INVALID_RESPONSE',s.row.status);return operation==='get_robot_realm_access'?s.row.access:s.row.v1.data};
 export const runRobotBusiness=async(e,operation,args,decode,next,feedback)=>{const s=globalThis.__navigation;s.calls.push({operation,args});if(s.row.transport)throw new Error('query failed');const r=s.row.result;if(r.success&&r.branch==='middleware'){e.__res=r;next();return{handled:true}}if(!r.success){await feedback(r.middleware.replies.at(-1));return{handled:true}}return{handled:false,data:decode(r.data,1)}};
 `}));
}}]});
return await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
}
const handlers={'navigation.more':await load('more'),'navigation.help':await load('help')};
async function run(mode,row,command,isPrivate=false){
 Object.assign(state,{mode,row,sent:[],calls:[],legacy:[],next:0});
 const e={name:isPrivate?'private.message.create':'message.create',UserId:row.bid,MessageId:'navigation',MessageText:command,isPrivate};
 await framework.run(handlers[row.operation][mode], e, ()=>state.next++);await new Promise(resolve=>setImmediate(resolve));return structuredClone(state.sent);
}
export const commands={
 'navigation.more':['/更多','/更多 修行','/更多 不存在','/更多 修行 2','/折叠','/扩展'],
 'navigation.help':['/帮助','/帮助 0','/帮助 1','/帮助 2','/帮助 3','/帮助 99','/help']
};
test('public navigation preserves full original bubbles for guests, realm thresholds, muted users and pages',async()=>{
 for(const row of rows.filter(r=>!r.fault))for(const command of commands[row.operation])for(const isPrivate of [false,true]){
  const actual=await run('current',row,command,isPrivate);assert.deepEqual(state.calls,[{operation:row.operation,args:{}}]);assert.equal(state.legacy.length,0);assert.equal(state.next,0);
  assert.deepEqual(actual,await run('old',row,command,isPrivate),row.state+' '+command);assert.equal(state.legacy.length,1);
 }
});
test('public navigation ends on transport or malformed DTO without supplementary API',async()=>{
 for(const operation of Object.keys(commands)){
  const ready=rows.find(r=>r.operation===operation&&!r.fault);
  for(const data of [null,{},[],{registered:true,moreVisibleCommands:[1],foldVisibleCommands:[]},{registered:1,moreVisibleCommands:[],foldVisibleCommands:[]}]){
   await run('current',{...ready,result:{...ready.result,data}},commands[operation][0]);assert.equal(state.calls.length,1);assert.equal(state.legacy.length,0);assert.equal(state.next,0);assert.equal(state.sent.length,1);
  }
  await run('current',{...ready,transport:true},commands[operation][0]);assert.equal(state.calls.length,1);assert.equal(state.sent.length,1);assert.equal(state.next,0);
 }
});
