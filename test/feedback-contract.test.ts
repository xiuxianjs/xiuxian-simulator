import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {mockBackendConfig} from './backend-config-helper';
import {getBackendFeedbackCategories,submitBackendFeedback,parseBackendFeedbackSubmit} from '../src/api/bot/feedback-submit';
import {getBackendFeedbacks,getBackendFeedbackDetail,parseBackendFeedbacks,parseBackendFeedbackDetail} from '../src/api/bot/queries';
import {parseCommand,parseFeedbackId,parsePageNumber,formatFeedbackInfo} from '../src/api/bot/feedback-robot';
import * as oldSubmit from '../src/response-apps/feedbacks/feedbackGame/app';
import * as oldDetail from '../src/response-apps/feedbacks/feedbackInfo/app';
import * as oldMine from '../src/response-apps/feedbacks/feedbacksMe/app';

test('feedback v1 SDK contracts and original pure helpers remain compatible with real domain receipts',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessFeedback','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:16*1024*1024});
 const rows=[...output.matchAll(/ROBOT_FEEDBACK_RESPONSE=([^|]+)\|(.+)/g)].map(m=>({op:m[1],result:JSON.parse(m[2]).data}));
 mockBackendConfig(t,{api_url:'https://feedback-contract.test',robot_auth_token:'test-token'});
 let payload:unknown;const calls:{url:string;method:string;data?:string}[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string;method:string;data?:string})=>{calls.push(call);return{status:200,headers:{},data:JSON.stringify({data:payload})}}}));
 for(const row of rows.filter(r=>r.result.success)){
  payload=row.result.data;calls.length=0;
  if(row.op==='feedback.compose'){
   if((payload as any).categories){payload=(payload as any).categories;await getBackendFeedbackCategories('player');assert.equal(new URL(calls[0].url).pathname,'/api/v1/feedback/categories');}
   else{assert.deepEqual(await submitBackendFeedback('player',1,'有效内容',{requestId:'feedback-test',idempotencyKey:'feedback-test'}),parseBackendFeedbackSubmit(payload));assert.equal(new URL(calls[0].url).pathname,'/api/v1/feedback');assert.deepEqual(JSON.parse(calls[0].data!),{categoryId:1,content:'有效内容'});}
  }else if(row.op==='feedback.mine'){
   assert.deepEqual(await getBackendFeedbacks('player',1),parseBackendFeedbacks(payload));const url=new URL(calls[0].url);assert.equal(url.pathname,'/api/v1/feedback/mine');assert.equal(url.searchParams.get('pageSize'),'5');
  }else{
   const id=(payload as any).id;assert.deepEqual(await getBackendFeedbackDetail('player',id),parseBackendFeedbackDetail(payload,id));assert.equal(new URL(calls[0].url).pathname,`/api/v1/feedback/${id}`);
  }
  assert.equal(calls.length,1);
 }
 for(const text of ['/反馈','/提交反馈 1 内容','/反馈 0','/反馈 -1 内容','/反馈 abc','/反馈 0x10 空 格','/查看反馈','/查看反馈 1xx','/查看反馈 -1','/我的反馈','/我的反馈 -1','/我的反馈 0x10']){
  assert.deepEqual(parseCommand(text),oldSubmit.parseCommand(text));assert.equal(parseFeedbackId(text),oldDetail.parseFeedbackId(text));assert.equal(parsePageNumber(text),oldMine.parsePageNumber(text));
 }
 for(const feedback of [{id:1,isReplied:false},{id:2,isReplied:true,reply:'回复',content:'内容','category.name':'建议'},{id:3,isReplied:true,reply:'',content:'内容'}])assert.equal(formatFeedbackInfo(feedback),oldDetail.formatFeedbackInfo(feedback));
});
