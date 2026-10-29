import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ResultCode } from 'alemonjs';
import { createMarkdownText } from '../node_modules/@alemonjs/qq-bot/lib/format.js';
const state = globalThis.__profileRoot = {};
const framework = createPresentationHarness(state);
const bundle = await build({
 stdin:{resolveDir:process.cwd(),contents:"export {default} from './src/response/message/me/res.ts'"},
 bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'profile',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/(api\/bot\/robot-business|utils\/useMessage|response\/(config|robotBusiness|mwBan))$/},a=>({path:a.path,namespace:'profile'}));
 b.onLoad({filter:/.*/,namespace:'profile'},()=>({contents:`
 export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];export default ()=>true;
 export { useMessage } from 'alemonjs';
 export const interceptTaskCompatibility=async()=>false;
 export const finishRobotBusiness=async(e,result)=>({handled:false,data:result.data});
 export const getRobotHomeOverview=async()=>{globalThis.__profileRoot.calls++;return{data:globalThis.__profileRoot.overview}};
 `}));
 }}]
});
const handler=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).default;
test('own profile renders actual root and local action between realm and experience with one request',async()=>{
 for(const isPrivate of [true,false]) for(const title of ['金·下品','金·极品',undefined]){
  state.sent=[];state.calls=0;
  state.overview={notifications:[],atmosphere:{kind:'none',text:null},profile:{found:true,user:{id:7,name:'道友',gender:1,signature:''},title:null,access:{},homeView:{realmName:'筑基初期',experienceText:'10/100',qiRecoverText:'',mentalRecoverText:'',isEarlyStarter:false,...(title?{spiritRootTitle:title}:{})},mental:{current:10,cap:500},qi:{current:10,cap:500},combatPower:100,absenceDays:null}};
  const e={name:isPrivate?'private.message.create':'message.create',UserId:'preview',MessageText:'/我的资料',isPrivate};
  const result=await framework.run(handler, e, ()=>{});await new Promise(r=>setImmediate(r));
  assert.equal(state.calls,1);assert.equal(state.sent.length,1);
  const message=result.messages[0];
  assert.equal(result.actions[message.actionIndex].results?.[0].code,ResultCode.Ok);
  const rows=[[]];
  for(const node of message.nodes.filter(node=>node.type==='Markdown').flatMap(node=>node.value)){
   if(node.type==='MD.newline') rows.push([]); else rows.at(-1).push(node);
  }
  const profileRow=rows.find(row=>row.some(button=>button.options?.data==='/改签名 新内容'));
  assert.ok(profileRow,'profile action row missing');
  assert.deepEqual(profileRow.filter(node=>node.type==='MD.button').map(button=>[button.value,button.options.data]),[['‹改签名›','/改签名 新内容'],['‹改称号›','/我的称号']]);
  assert.ok(!result.messages[0].commands.includes('/我的主题'));

  const text=state.sent[0].filter(n=>n.type==='Markdown').map(n=>createMarkdownText(n.value)).join('\n');
  const line=text.split('\n').find(line=>line.startsWith('灵根：'));
  assert.ok(line.includes(title??'暂无'));assert.ok(line.includes('text="/我的灵根"'));assert.ok(line.includes('‹升品›'));
  assert.ok(text.indexOf('境界：')<text.indexOf('灵根：'));assert.ok(text.indexOf('灵根：')<text.indexOf('修为：'));
 }
});
