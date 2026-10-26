import { mockBackendConfig } from './backend-config-helper';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { executeSweep } from '../src/response-apps/dungeon/sweep/app';
import { sweepBackendDungeon, sweepBackendFreeDungeons } from '../src/api/bot/dungeon-sweep';

for (const free of [false, true]) {
  test(`sweep ${free ? 'free batch' : 'batch'} waits for a 16-second settlement and keeps its idempotency key`, async t => {
    mockBackendConfig(t, { api_url: 'http://backend.test', robot_auth_token: 'test-token', api_timeout_ms: 10000 });
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let resolveResponse!: (response: {status:number;headers:Record<string,string>;data:string}) => void;
    let signal: AbortSignal | undefined;
    let calls = 0;
    let headers: Headers;
    t.mock.method(axios, 'create', () => ({
      request(options: {signal:AbortSignal;headers:Record<string,string>}) {
        calls++;
        signal=options.signal;
        headers=new Headers(options.headers);
        return new Promise(resolve => { resolveResponse=resolve; });
      }
    }));
    const context = { requestId: 'request-id', idempotencyKey: 'platform-message-key' };
    const pending = free ? sweepBackendFreeDungeons('bid', 1, context) : sweepBackendDungeon('bid', 1, '桃花镇', 10, context);
    assert.equal(calls, 1);
    assert.equal(headers!.get('Idempotency-Key'), 'platform-message-key');
    t.mock.timers.tick(16000);
    assert.equal(signal?.aborted, false);
    const sweep = { dungeonName: '桃花镇', times: 8, totalSpiritCost: 160, totalExp: 80, currency: [], items: [] };
    resolveResponse({status:200,headers:{},data:JSON.stringify({data:free?{sweptDungeons:[sweep],totalTimes:8,totalExp:80,totalSpiritCost:160}:sweep})});
    const result = await pending;
    assert.equal(result.totalSpiritCost, 160);
    assert.equal(calls, 1, 'the write must not be retried');
  });
}

test('final timeout reports an unknown settlement without retrying the write', async t => {
  mockBackendConfig(t, { api_url: 'http://backend.test', robot_auth_token: 'test-token', api_timeout_ms: 10000 });
  t.mock.timers.enable({apis:['setTimeout']});
  let calls=0;
  t.mock.method(axios,'create',()=>({request(options:{signal:AbortSignal}){
    calls++;
    return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
  }}));
  const pending=executeSweep({bid:'bid',uid:1,dungeonName:'桃花镇',times:10,request:{requestId:'request-id',idempotencyKey:'platform-message-key'}});
  t.mock.timers.tick(60000);
  const result=await pending;
  assert.equal(result.code,'FAIL');
  assert.equal(result.data.message,'战斗结果暂未确认，请先查看角色状态和战斗记录，避免重复操作。');
  assert.equal(calls,1);
});
