import assert from 'node:assert/strict';
import {beforeEach,test,after} from 'node:test';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {Format, shutdownLogger} from 'alemonjs';
import {createTestApp} from 'alemonjs/testing';
import {expendContext} from '../node_modules/alemonjs/lib/application/context.js';

const state=globalThis.__onboardingFollowupTest={sent:[]};
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:"export {sendOnboardingFollowup} from './src/response/onboarding/followup.ts';export {onboardingContent} from './src/response/onboarding/context.ts';"},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'followup-transport',setup(b){
 b.onResolve({filter:/^alemonjs$/},()=>({path:pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href,external:true}));
 b.onResolve({filter:/^@src\/utils\/useMessage$|^\.\/useMessage$|^@src\/api\/bot\/robot-business$/},a=>({path:a.path,namespace:'seam'}));
 b.onLoad({filter:/.*/,namespace:'seam'},()=>({contents:`
 export const requestRobotBusiness=async()=>{throw new Error('followup renderer cannot issue requests')};
 export {useMessage} from 'alemonjs';
 `}));
}}]});
const {sendOnboardingFollowup,onboardingContent}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const event={name:'message.create',Platform:'qq-bot',UserId:'new',BotId:'bot',ChannelId:'group',MessageId:'followup',MessageText:'/出关'};
const view={status:'completed',phase:'completed',version:20,title:'宋玉',feedback:[],lines:['当前修为128/300，精力116','按缺口扫荡7次'],actions:[{label:'按缺口扫荡 · /主线扫荡 1-1 7',command:'/主线扫荡 1-1 7'},{label:'任务面板 · /任务面板',command:'/任务面板'}]};
const receipt=()=>Format.createMarkdown().addText('本次获得：修为128 · 真气32').addNewline().addBlockquote(Format.createMarkdown().addText('额外掉落：真实材料 ×2'));
let app;
const send=async(meta,e=event)=>(await app.invoke(e,()=>sendOnboardingFollowup(e,meta,'闭关结束',receipt()))).value;
beforeEach(async()=>{
 await app?.dispose();app=createTestApp();await app.mount({responseContent:onboardingContent});state.sent=[];state.mode='ok';
 app.actions.on('message.send',request=>{
  state.sent.push({format:{value:structuredClone(request.payload.params.format)}});
  return [{code:state.mode==='offline'||(state.mode==='fallback'&&state.sent.length===1)?4000:2000,message:'test',data:{}}];
 });
});
after(async()=>{await app?.dispose();await shutdownLogger();delete globalThis.__onboardingFollowupTest;});

test('legacy response stays with its original renderer',async()=>{
 assert.equal(await send({}),false);assert.equal(state.sent.length,0);
});
test('committed receipt and two current choices share one bubble without a Context',async()=>{
 assert.equal(await send({onboarding:view}),true);assert.equal(state.sent.length,1);
 const text=JSON.stringify(state.sent[0].format.value);
 for(const value of ['修为128 · 真气32','真实材料 ×2','/主线扫荡 1-1 7','/任务面板'])assert.ok(text.includes(value),text);
 assert.ok(!text.includes('/退出引导'));assert.ok(!text.includes('/继续引导'));
 let next=0;assert.equal((await app.invoke(event,()=>expendContext(event,event.name,()=>next++,'response'))).value,false);assert.equal(next,1);
});
test('unavailable guidance retains the successful receipt and only offers safe reads',async()=>{
 await send({onboardingPending:true});
 const text=JSON.stringify(state.sent[0].format.value);
 for(const value of ['修为128 · 真气32','真实材料 ×2','/继续引导','/任务面板'])assert.ok(text.includes(value),text);
 assert.ok(!text.includes('/主线扫荡'));assert.ok(!text.includes('/退出引导'));
});
test('failed rich delivery tries one plain receipt without losing nested drops or reissuing a request',async()=>{
 state.mode='fallback';await send({onboarding:view});assert.equal(state.sent.length,2);
 const text=JSON.stringify(state.sent[1].format.value);
 for(const value of ['修为128 · 真气32','真实材料 ×2','/主线扫荡 1-1 7'])assert.ok(text.includes(value),text);
 assert.ok(!text.includes('MD.'));
});
test('two delivery failures are bounded and private results contain no mention',async()=>{
 state.mode='offline';assert.equal(await send({onboarding:view}),true);assert.equal(state.sent.length,2);
 state.sent=[];state.mode='ok';await send({onboarding:view},{...event,name:'private.message.create',isPrivate:true});
 assert.ok(!JSON.stringify(state.sent[0].format.value).includes('MD.mention'));
});

test('return choices and normal navigation fill in commands',async()=>{
 const bound={...view,choiceBound:true,version:2**48+123};
 await send({onboarding:bound});
 const rows=state.sent[0].format.value.find(v=>v.type==='BT.group').value;
 const first=rows[0].value[0],second=rows[1].value[0];
 assert.equal(first.options.type,'command');
 assert.equal(first.options.rawData?.id,undefined);
 assert.deepEqual(first.options.permission,{type:0,userIds:['new']});
 assert.equal(first.options.data,'/主线扫荡 1-1 7');
 assert.equal(second.options.type,'command');assert.equal(second.options.data,'/任务面板');
 assert.equal(second.options.rawData?.id,undefined);
 let next=0;assert.equal((await app.invoke(event,()=>expendContext(event,event.name,()=>next++,'response'))).value,false);assert.equal(next,1);
});

test('restoring mental with owned pills fills in the original command',async()=>{
 const bound={...view,choiceBound:true,version:2**48+321,actions:[{label:'按缺口补充精力 · /服用 精力丹 2',command:'/服用 精力丹 2'},view.actions[1]]};
 await send({onboarding:bound});
 const button=state.sent[0].format.value.find(v=>v.type==='BT.group').value[0].value[0];
 assert.equal(button.options.type,'command');assert.equal(button.options.data,'/服用 精力丹 2');
 assert.equal(button.options.rawData?.id,undefined);
});

test('return guidance preserves explicit lines alongside the committed receipt',async()=>{
 const e={...event,isPrivate:true,name:'private.message.create'};
 const multiline={...view,lines:['境界：炼气二层\n修为：128/300\n精力：116','扫荡次数：7次\n消耗精力：70\n预计入账修为：175']};
 const result=await app.invoke(e,()=>sendOnboardingFollowup(e,{onboarding:multiline},'闭关结束',receipt()));
 assert.equal(result.value,true);
 assert.equal(result.messages.length,1);
 const message=result.messages[0];
 assert.equal(result.actions[message.actionIndex].results[0].code,2000);
 const md=message.nodes.find(node=>node.type==='Markdown').value;
 const facts=md.filter(node=>node.type==='MD.text').map(node=>node.value);
 for(const line of ['境界：炼气二层','修为：128/300','精力：116','扫荡次数：7次','消耗精力：70','预计入账修为：175'])assert.ok(facts.includes(line),JSON.stringify(facts));
 assert.ok(JSON.stringify(md).includes('真实材料 ×2'));
 assert.deepEqual(message.commands,['/主线扫荡 1-1 7','/任务面板']);
});


test('new realm lesson attaches its real Context and command choices to the breakthrough receipt',async()=>{
 const lesson={...view,status:'active',phase:'milestone.friends',version:21,lines:['本节点开放的功能：','成就','好友'],actions:[{label:'查看开放说明 · /天书',command:'/天书'}]};
 const result=await app.invoke(event,()=>sendOnboardingFollowup(event,{onboarding:lesson},'突破成功',receipt()));
 assert.equal(result.messages.length,1);
 const message=result.messages[0];
 assert.equal(result.actions[message.actionIndex].results[0].code,2000);
 assert.ok(message.text.includes('真实材料 ×2'));
 assert.ok(message.text.includes('本节点开放的功能：'));
 const rows=message.nodes.find(node=>node.type==='BT.group').value;
 assert.deepEqual(rows.map(row=>row.value[0].options.data),['/天书','/退出引导']);
 assert.equal(rows[0].value[0].options.type,'command');
 assert.equal(rows[0].value[0].options.rawData?.id,undefined);
 let next=0;
 const help={...event,MessageText:'/帮助'};
 assert.equal((await app.invoke(help,()=>expendContext(help,help.name,()=>next++,'response'))).value,true);
 assert.equal(next,1);
});
