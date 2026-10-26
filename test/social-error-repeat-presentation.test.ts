import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import App0 from '../src/response-apps/team/acceptInvitation/app';
import App1 from '../src/response-apps/team/approve/app';
import App2 from '../src/response-apps/team/cancelApplication/app';
import App3 from '../src/response-apps/team/cancelInvitation/app';
import App4 from '../src/response-apps/team/createTeam/app';
import App5 from '../src/response-apps/team/disbandTeam/app';
import App6 from '../src/response-apps/team/inviteTeam/app';
import App7 from '../src/response-apps/team/joinTeam/app';
import App8 from '../src/response-apps/team/kick/app';
import App9 from '../src/response-apps/team/leaveTeam/app';
import App10 from '../src/response-apps/team/reject/app';
import App11 from '../src/response-apps/team/rejectInvitation/app';
import App12 from '../src/response-apps/team/setPosition/app';
import App13 from '../src/response-apps/team/setRealm/app';
import App14 from '../src/response-apps/team/transferLeader/app';
import App15 from '../src/response-apps/master/accept/app';
import App16 from '../src/response-apps/master/apply/app';
import App17 from '../src/response-apps/master/bless/app';
import App18 from '../src/response-apps/master/expel/app';
import App19 from '../src/response-apps/master/gift/app';
import App20 from '../src/response-apps/master/graduateAccept/app';
import App21 from '../src/response-apps/master/graduateApply/app';
import App22 from '../src/response-apps/master/graduateReject/app';
import App23 from '../src/response-apps/master/rebel/app';
import App24 from '../src/response-apps/master/teach/app';

test('all 25 team and master repeat branches relay exact HTTP error messages and original commands', async t => {
 mockBackendConfig(t, { api_url: 'https://social.test', robot_auth_token: 'test-only-token' });
 const calls: { headers: Record<string,string> }[]=[];
 t.mock.method(axios,'create',()=>({request:async(options:typeof calls[number])=>{
  calls.push(options);
  return {status:409,headers:{},data:JSON.stringify({error:{code:'CONFLICT',message:'原业务错误，保留原文',details:{original:true}}})};
 }}));
 const params={bid:'one',uid:1,applicationId:2,invitationId:2,targetUid:2,teamId:2,
  selector:{targetUid:'2'},position:2,realmName:'筑基',targetArg:'2',discipleArg:'2',
  request:{requestId:'error-repeat',idempotencyKey:'error-repeat-key'}};
 const runs: [() => Promise<unknown>, string][]=[
    [() => App0({ ...params, repeatCommand: '队伍邀请同意' }), '队伍邀请同意'],
    [() => App1({ ...params, repeatCommand: '队伍同意' }), '队伍同意'],
    [() => App2({ ...params, repeatCommand: '取消队伍申请' }), '取消队伍申请'],
    [() => App3({ ...params, repeatCommand: '取消队伍邀请' }), '取消队伍邀请'],
    [() => App4({ ...params, repeatCommand: '创建队伍' }), '创建队伍'],
    [() => App5({ ...params, repeatCommand: '解散队伍' }), '解散队伍'],
    [() => App6({ ...params, repeatCommand: '邀请入队' }), '邀请入队'],
    [() => App7({ ...params, repeatCommand: '加入队伍' }), '加入队伍'],
    [() => App8({ ...params, repeatCommand: '队伍踢出' }), '队伍踢出'],
    [() => App9({ ...params, repeatCommand: '离开队伍' }), '离开队伍'],
    [() => App10({ ...params, repeatCommand: '队伍拒绝' }), '队伍拒绝'],
    [() => App11({ ...params, repeatCommand: '队伍邀请拒绝' }), '队伍邀请拒绝'],
    [() => App12({ ...params, repeatCommand: '队伍位置设置' }), '队伍位置设置'],
    [() => App13({ ...params, repeatCommand: '设置队伍境界门槛' }), '设置队伍境界门槛'],
    [() => App14({ ...params, repeatCommand: '转让队长' }), '转让队长'],
    [() => App15({ ...params, repeatCommand: '同意拜师' }), '同意拜师'],
    [() => App16({ ...params, repeatCommand: '拜师' }), '拜师'],
    [() => App17({ ...params, repeatCommand: '赐福' }), '赐福'],
    [() => App18({ ...params, repeatCommand: '逐出师门' }), '逐出师门'],
    [() => App19({ ...params, repeatCommand: '赐丹' }), '赐丹'],
    [() => App20({ ...params, repeatCommand: '同意出师' }), '同意出师'],
    [() => App21({ ...params, repeatCommand: '申请出师' }), '申请出师'],
    [() => App22({ ...params, repeatCommand: '拒绝出师' }), '拒绝出师'],
    [() => App23({ ...params, repeatCommand: '叛离师门' }), '叛离师门'],
    [() => App24({ ...params, repeatCommand: '传功' }), '传功'],
 ];
 for(const [run,command] of runs){
  const before=calls.length;
  const result=await run() as {data:{message:string}};
  assert.equal(calls.length-before,1,command);
  assert.equal(new Headers(calls.at(-1)!.headers).get('X-Repeat-Command'),Buffer.from(command,'utf8').toString('base64'));
  assert.equal(result.data.message,'原业务错误，保留原文');
 }
 const fallbackRuns: (() => Promise<unknown>)[]=[
  () => App2({...params,applicationId:undefined,repeatCommand:"取消队伍申请"}),
  () => App15({...params,discipleArg:undefined,repeatCommand:'同意拜师'}),
  () => App20({...params,discipleArg:undefined,repeatCommand:'同意出师'}),
  () => App22({...params,discipleArg:undefined,repeatCommand:'拒绝出师'}),
 ];
 for(const run of fallbackRuns){
  const before=calls.length; await run(); assert.equal(calls.length-before,1);
  assert.equal(new Headers(calls.at(-1)!.headers).get("X-Repeat-Command"),null);
 }

});
