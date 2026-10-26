import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import axios from 'axios';
import {withEventContext} from 'alemonjs';
import {mockBackendConfig} from './backend-config-helper';
import joinLingzhi from '../src/response-apps/profession/joinLingzhi/app';
import {parseRobotLingzhiGuide,isLingzhiGuideContinue} from '../src/api/bot/lingzhi-robot-guide';

test('actual v1 lingzhi SDK/App preserves all start, advance, completion and failure results',async t=>{
 const output=execFileSync('go',['test','./internal/httpapi','-run','^TestRobotBusinessLingzhiGuideV1AndState$','-v','-count=1'],{cwd:fileURLToPath(new URL('../../xiuxian-game-server/',import.meta.url)),encoding:'utf8',maxBuffer:24*1024*1024});
 const rows=[...output.matchAll(/ROBOT_LINGZHI_V1=([^|]+)\|(true|false)\|(\d+)\|(.+)/g)].map(m=>({state:m[1],continued:m[2]==='true',status:Number(m[3]),body:JSON.parse(m[4])}));assert.equal(rows.length,32);
 mockBackendConfig(t,{api_url:'https://lingzhi.test',robot_auth_token:'test-token'});
 let current:typeof rows[number];const calls:string[]=[];
 t.mock.method(axios,'create',()=>({request:async(call:{url:string})=>{calls.push(new URL(call.url).pathname);return{status:current.status,headers:{},data:JSON.stringify(current.body)}}}));
 for(const row of rows){current=row;calls.length=0;const text=row.continued?'/继续灵药指引':'/加入灵药师';
  const e={name:'message.create',UserId:'player',MessageId:'lingzhi-'+row.state+'-'+row.continued,uid:1,MessageText:text} as unknown as Parameters<typeof withEventContext>[0];
  await withEventContext(e,()=>{},async()=>{const result=await joinLingzhi({bid:'player',uid:1,messageText:text,request:{requestId:'lingzhi-test',idempotencyKey:'lingzhi-'+row.state+'-'+row.continued}});const expected=row.status!==200?{code:'FAIL',data:{message:'灵药师指引处理失败，请稍后重试。'}}:row.continued&&!row.body.data.session&&!row.body.data.completed?{code:'FAIL',data:{message:'你还未开始灵药师指引，请先使用 /加入灵药师'}}:parseRobotLingzhiGuide(row.body.data);assert.deepEqual(result,expected);});
  assert.deepEqual(calls,['/api/v1/players/1/professions/lingzhi/guide/'+(row.continued?'continue-current':'start')]);
 }
 for(const value of [null,{}, {completed:false},{completed:false,session:{step:5,createTime:1,expireTime:2,version:1}}])assert.throws(()=>parseRobotLingzhiGuide(value));
 for(const text of ['/继续灵药指引',' /继续 ','继续其他'])assert.equal(isLingzhiGuideContinue(text),true);
 assert.equal(isLingzhiGuideContinue('/加入灵药师'),false);
});
