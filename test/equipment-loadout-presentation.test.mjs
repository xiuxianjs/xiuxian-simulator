import { withoutEquipmentRecovery } from './helpers/equipment-recovery-delta.mjs';
import { goTestFixture } from './helpers/go-fixture.mjs';
import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const state=globalThis.__equipmentLoadout={sent:[],calls:0};
const framework = createPresentationHarness(state);
const bundle=await build({stdin:{contents:`
 export {default as auto} from './src/response/equipment/autoEquip/res.ts';
 export {default as unequip} from './src/response/equipment/unequipItem/res.ts';
 export {default as old_auto} from 'old-auto';export {default as old_unequip} from 'old-unequip';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'loadout',setup(b){
 b.onResolve({filter:/^old-/},a=>({path:a.path.slice(4),namespace:'legacy'}));
 b.onLoad({filter:/.*/,namespace:'legacy'},a=>({loader:'ts',contents:readFileSync(new URL(a.path==='auto'?'./fixtures/equipment-auto-equip-before-v2.ts.txt':'./fixtures/equipment-unequip-one-before-v2.ts.txt',import.meta.url),'utf8'),resolveDir:process.cwd()}));
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(utils\/(useMessage|backendRepeatDetector)|response\/(config|robotBusiness)|api\/bot\/context)$/},a=>({path:a.path,namespace:'seam'}));
 b.onResolve({filter:/^\.\/client$/},()=>({path:'client',namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({resolveDir:process.cwd(),contents:`
 import { withBusinessRecovery } from ${JSON.stringify(resolve('src/response/businessRecovery.ts'))};
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export const createBackendRequestContext=()=>({requestId:'test',idempotencyKey:'test'});export const writeContext=()=>({});export const writeTraceContext=()=>({});
 export const requestBackend=async(bid,op,options)=>{const s=globalThis.__equipmentLoadout;if(!s.kind.startsWith('old_'))throw new Error('supplementary API');s.legacyCalls++;if(s.row.status!==200)throw new Error('original failure');return s.row.v1.data};
 export const withBackendRepeatDetection=async(bid,uid,command,message)=>{const suffix=globalThis.__equipmentLoadout.row.v1?.presentation?.repeat?.suffix;return suffix?message+'\\n\\n'+suffix:message};
 export { useMessage } from 'alemonjs';
 export const runRobotBusiness=async(e,op,args,decode,next,feedback)=>{const s=globalThis.__equipmentLoadout;s.calls++;s.op=op;s.args=args;if(s.transport)throw new Error('transport');const r=s.row.result;if(r.branch==='middleware'){next();return{handled:true}}if(!r.success){await feedback(withBusinessRecovery(op,r.middleware.replies.at(-1)));return{handled:true}}return{handled:false,data:decode(r.data)}};
 `}));
}}]});
const handlers=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const output=goTestFixture(['test','./internal/httpapi','-run','^TestRobotBusinessEquipment(UnequipOne|AutoEquip|Loadout)','-v','-count=1'], {cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:48*1024*1024});
const rows=[...output.matchAll(/ROBOT_EQUIPMENT_LOADOUT=(.+)/g)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,132);
async function run(name,row,isPrivate){Object.assign(state,{kind:name,sent:[],calls:0,next:0,legacyCalls:0,row});const e={name:'message.create',UserId:'player',uid:1,MessageText:row.text,isPrivate};await framework.run(handlers[name], e, ()=>state.next++);return state.sent;}
const kind=row=>row.op==='equipment.auto-equip'?'auto':'unequip';
test('loadout original business, failure, usage, repeat, ordering and power bubbles match in group/private',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='business'))for(const isPrivate of [false,true]){
  const name=kind(row),actual=await run(name,row,isPrivate);
  assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.deepEqual(state.args,row.arguments);assert.equal(actual.length,1);
  assert.deepEqual(withoutEquipmentRecovery(actual,row),await run('old_'+name,row,isPrivate),row.text+' '+row.state);
 }
 for(const op of ['equipment.auto-equip','equipment.unequip-one'])assert.ok(rows.some(r=>r.op===op&&r.v1?.presentation?.repeat?.suffix));
});
test('loadout mute uses parent next; transport and malformed/refusal DTOs end without supplementary API',async()=>{
 for(const row of rows.filter(r=>r.result.branch==='middleware')){await run(kind(row),row,true);assert.equal(state.calls,1);assert.equal(state.next,1);assert.equal(state.sent.length,0);}
 for(const name of ['auto','unequip'])for(const transport of [true,false]){
  const candidates=name==='auto'?[{}, {success:false,message:'原拒绝',results:[]}]:[{}, {outcome:'not_equipped',stage:'none',instanceId:null}, {outcome:'unequipped',stage:'updated',instanceId:1}];
  for(const data of candidates){
   state.transport=transport;await run(name,{text:name==='auto'?'/一键装备':'/卸下 武器',result:{success:true,branch:'business',data}},false);
   assert.equal(state.calls,1);assert.equal(state.next,0);assert.equal(state.legacyCalls,0);assert.equal(state.sent.length,1);
   assert.ok(JSON.stringify(state.sent).includes(name==='auto'?'一键装备失败，请稍后重试':'卸下装备操作失败，请稍后重试'));
  }
 }state.transport=false;
});
test('original autoEquip nonempty partial result and optional power remain displayable',async()=>{
 const original=rows.find(r=>r.op==='equipment.auto-equip'&&r.status===200&&r.v1.data.results.length>0);
 for(const power of [undefined,0,1234]){
  const data={...original.v1.data,success:false,...(power===undefined?{}:{power})};if(power===undefined)delete data.power;
  const row={...original,v1:{data},result:{success:true,branch:'business',data}};
  const actual=await run('auto',row,false);assert.equal(state.calls,1);assert.equal(state.next,0);
  assert.deepEqual(withoutEquipmentRecovery(actual,row),await run('old_auto',row,false));
 }
});
