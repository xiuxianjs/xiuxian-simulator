import assert from 'node:assert/strict';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import App0 from '../src/response-apps/guild/addEssence/app';
import App1 from '../src/response-apps/guild/removeEssence/app';
import App2 from '../src/response-apps/guild/setIntro/app';
import App3 from '../src/response-apps/guild/setNotice/app';
import App4 from '../src/response-apps/guild/setMinRealm/app';
import App5 from '../src/response-apps/guild/dissolveGuild/app';
import App6 from '../src/response-apps/guild/exchange/app';
import App7 from '../src/response-apps/guild/claimAllMilestones/app';
import App8 from '../src/response-apps/guild/createGuild/app';
import App9 from '../src/response-apps/guild/joinGuild/app';
import App10 from '../src/response-apps/guild/leaveGuild/app';
import App11 from '../src/response-apps/guild/stipend/app';
import App12 from '../src/response-apps/guild/viewIntro/app';
import App13 from '../src/response-apps/guild/viewNotice/app';
import App14 from '../src/response-apps/guild/cancelApplication/app';
import App15 from '../src/response-apps/guild/refresh/app';
import App16 from '../src/response-apps/guild/storyline/challenge/app';
import App17 from '../src/response-apps/friend/blockUser/app';
import App18 from '../src/response-apps/friend/unblockUser/app';
import App19 from '../src/response-apps/friend/rejectBefriend/app';
import App20 from '../src/response-apps/friend/befriend/app';

test('remaining guild and friend repeat paths carry original commands in one business request',async t=>{
 mockBackendConfig(t,{api_url:'https://rest.test',robot_auth_token:'test-only-token'});
 const calls:{headers:Record<string,string>}[]=[];
 t.mock.method(axios,'create',()=>({request:async(options:typeof calls[number])=>{
  calls.push(options);return{status:200,headers:{},data:JSON.stringify({data:{}})};
 }}));
 const params={bid:'one',uid:1,content:'精华',intro:'简介',notice:'公告',essenceId:1,searchTerm:'筑基',
  itemIndex:1,type:'daily_activity' as const,guildName:'宗门',guildId:1,applicationId:1,
  targetName:'目标',input:'123',requestId:1,selector:{targetUid:'2'},repeatCommand:'原文命令',
  request:{requestId:'rest-repeat',idempotencyKey:'rest-repeat-key'}};
 const runs=[
  () => App0(params),
  () => App1(params),
  () => App2(params),
  () => App3(params),
  () => App4(params),
  () => App5(params),
  () => App6(params),
  () => App7(params),
  () => App8(params),
  () => App9(params),
  () => App10(params),
  () => App11(params),
  () => App12(params),
  () => App13(params),
  () => App14(params),
  () => App15(params),
  () => App16(params),
  () => App17(params),
  () => App18(params),
  () => App19(params),
  () => App20(params),
 ];
 for(const run of runs){
  const before=calls.length;
  try{await run();}catch{/* Invalid DTO keeps the pre-existing local failure behavior. */}
  assert.equal(calls.length-before,1);
  assert.equal(new Headers(calls.at(-1)!.headers).get('X-Repeat-Command'),Buffer.from('原文命令','utf8').toString('base64'));
 }
});
