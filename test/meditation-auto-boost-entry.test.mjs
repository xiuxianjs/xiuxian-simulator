import { createPresentationHarness } from './helpers/framework-presentation.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';


const state = globalThis.__autoBoostEntry = { sent: [], calls: [], enabled: false };
const framework = createPresentationHarness(state, { capture: 'payload' });
const bundle = await build({
  stdin: { contents: "export {default as settings} from './src/response/message/settings/res.ts';export {default as toggle} from './src/response/message/config/meditationAutoBoost/res.ts';", resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'auto-boost-entry', setup(builder) {
    builder.onResolve({ filter: /^alemonjs$/ }, () => ({ path: pathToFileURL(resolve('node_modules/alemonjs/lib/index.js')).href, external: true }));
    builder.onResolve({ filter: /^@src\/(notification\/channel|response\/(config|robotBusiness)|utils\/(messageHelper|useMessage)|api\/bot\/settings-robot-query)$/ }, a => ({ path: a.path, namespace: 'seam' }));
    builder.onLoad({ filter: /.*/, namespace: 'seam' }, () => ({ contents: `
      export const selects=['message.create','private.message.create','interaction.create','private.interaction.create'];
      export const describeNotificationGroup=async()=>[];
      export const FormatGui=p=>({...p,content:p.content.value});
      export { useMessage } from 'alemonjs';
      export const validateRobotSettingsOverview=x=>x;
      export const validateRobotPreference=(data,field,expected,action)=>{if(data[field]!==expected)throw Error('invalid receipt');return action};
      export const runRobotBusiness=async(e,op,args,decode)=>{
        const s=globalThis.__autoBoostEntry;s.calls.push({op,args});
        const data=op==='settings.overview'?{preferences:{meditationAutoBoost:s.enabled,dungeonBattleMode:'auto',teamDungeonNoMental:false,autoApproveFriendTeam:false,hideProfile:false,confirmSpiritCrystal:1000,confirmDaoCrystal:1,teamInviteEnabled:true,teamAutoAcceptInvite:'none'},subscription:null,groupSnapshot:null,groupSnapshotUnavailable:false}:{meditationAutoBoost:args.value};
        return {handled:false,data:decode(data)};
      };
    ` }));
  } }]
});
const handlers = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
function buttons(value) {
  if (!value || typeof value !== 'object') return [];
  return [ ...(value.type === 'MD.button' ? [value] : []), ...Object.values(value).flatMap(buttons) ];
}
async function render(handler, text, enabled) {
  state.sent=[];state.calls=[];state.enabled=enabled;
  const event={name:'private.message.create',UserId:'player',MessageText:text,isPrivate:true};
  await framework.run(handlers[handler], event, ()=>{});
  return state.sent[0];
}
for (const enabled of [false,true]) {
  test(`settings shows saved automatic boost ${enabled} and opposite action`, async()=>{
    const page=await render('settings','/我的设置',enabled);
    assert.deepEqual(state.calls,[{op:'settings.overview',args:{includeGroup:false}}]);
    assert.ok(JSON.stringify(page.content).includes(`闭关自动加速：${enabled?'开启':'关闭'}`));
    assert.ok(buttons(page.content).some(b=>b.options.data===`/配置闭关自动加速 ${enabled?'关闭':'开启'}`));
    for(const value of ['下次闭关','出关结算费用','灵石不足'])assert.ok(JSON.stringify(page.content).includes(value));
  });
  test(`toggle ${enabled} saves one player preference and explains next session`,async()=>{
    const page=await render('toggle',`/配置闭关自动加速 ${enabled?'开启':'关闭'}`,!enabled);
    assert.deepEqual(state.calls,[{op:'settings.meditation-auto-boost',args:{value:enabled}}]);
    assert.ok(JSON.stringify(page.content).includes(`闭关自动加速已${enabled?'开启':'关闭'}`));
    assert.ok(JSON.stringify(page.content).includes('本轮闭关不受影响'));
    assert.ok(buttons(page.content).some(b=>b.options.data==='/我的设置'));
  });
}
test('invalid switch does not save or start paid meditation',async()=>{
  const page=await render('toggle','/配置闭关自动加速 随便',false);
  assert.deepEqual(state.calls,[]);
  assert.ok(JSON.stringify(page.content).includes('请使用'));
});
