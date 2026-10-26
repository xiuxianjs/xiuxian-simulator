import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';

const bundled=await build({entryPoints:['src/response/onboarding/policy.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {canonicalOnboardingCommand:canonical,isOnboardingHelp,onboardingFooter,onboardingButtonId,onboardingButtonVersion}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const view={status:'active',phase:'explore',version:1,title:'宋玉',lines:[],feedback:[],actions:[{label:'挑战关卡 · /主线挑战 1-2',command:'/主线挑战 1-2'},{label:'领取宝箱 · /领取宝箱 1',command:'/领取宝箱 1'}]};

test('onboarding passes exact help reads without permitting arbitrary commands',()=>{
 for(const command of ['/帮助','＃攻略','/我的天赋','/help','/菜单'])assert.equal(isOnboardingHelp(canonical(command)),true,command);
 for(const command of ['/帮助 突破','/攻略 /突破','/我的天赋 重置','/突破','/主线挑战 1-4'])assert.equal(isOnboardingHelp(canonical(command)),false,command);
 assert.equal(canonical('  /主线扫荡  1-1   7  '),'主线扫荡 1-1 7');
});
test('long choices have individual rows and do not mutate allowed actions',()=>{
 const before=structuredClone(view);
 const rows=onboardingFooter(view);
 assert.deepEqual(rows.map(row=>row.length),[1,1,1]);
 assert.deepEqual(rows.flat().map(button=>button.command),['/主线挑战 1-2','/领取宝箱 1','/退出引导']);
 assert.deepEqual(view,before);
});
test('exited can explicitly resume, completed never offers a new enrollment',()=>{
 assert.deepEqual(onboardingFooter({...view,status:'exited'}).flat().map(b=>b.command),['/继续引导','/任务面板']);
 assert.deepEqual(onboardingFooter({...view,status:'completed',actions:[]}).flat().map(b=>b.command),['/出关','/任务面板']);
 assert.deepEqual(onboardingFooter({...view,status:'absent'}).flat().map(b=>b.command),['/任务面板']);
});

test('completed navigation uses live ordinary commands without adding a resume or exit gate',()=>{
 for(const command of ['/闭关','/出关','/我的境界']){
  const actions=[{label:`当前目标 · ${command}`,command},{label:'任务面板 · /任务面板',command:'/任务面板'}];
  assert.deepEqual(onboardingFooter({...view,status:'completed',actions}),actions.map(a=>[a]));
 }
});


test('version metadata accepts safe canonical IDs and refuses malformed owned callbacks',()=>{
 const callback=(id,data='/普攻')=>({name:'interaction.create',MessageText:'/普攻',InteractionData:JSON.stringify({button_id:id,button_data:data})});
 for(const version of [1,36,Number.MAX_SAFE_INTEGER]){
  const id=onboardingButtonId(version,2);
  assert.ok(id.length<=16);
  assert.equal(onboardingButtonVersion(callback(id)),version);
 }
 for(const id of ['ob0.0','ob01.0','ob1.3','obzzzzzzzzzzz.0','ob?.0'])assert.equal(onboardingButtonVersion(callback(id)),null,id);
 assert.equal(onboardingButtonVersion(callback('ob1.0','/自动')),null);
 assert.equal(onboardingButtonVersion(callback('ordinary')),undefined);
 assert.equal(onboardingButtonVersion({...callback('ob1.0'),name:'message.create'}),undefined);
});

test('teaching control and navigation labels show the exact submitted command',()=>{
 for(const state of ['active','soft','completed','exited','absent']) {
  for(const button of onboardingFooter({...view,status:state}).flat())assert.ok(button.label.includes(button.command),`${state}: ${button.label}`);
 }
});
