import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Expose, shutdownLogger } from 'alemonjs';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';
import { businessEnvelope, gameFixture } from './fixture';

after(() => shutdownLogger());
const ref = 'r1_1_y_mh9of000_0123456789abcdef01234567';
const view = (preview = false) => ({
  rulesVersion: 'fishing-v0.13', view: preview ? 'preview' : 'overview', title: '垂钓', status: preview ? 'preview' : 'idle',
  sections: [{ title: '本人水域', id: '', suffix: '', lines: ['状态：仅本人'], actions: [] }], footer: [],
  ...(preview ? { confirmationRef: ref, operationId: 'original-operation', expiresAt: '2026-11-03T22:00:00Z' } : {})
});

test('垂钓expose使用真实授权上下文、3ops和新观察，原确认重复稳定', async t => {
  const { app, requests } = await gameFixture(t, request => businessEnvelope(request.bid, view(request.path.endsWith('.preview'))));
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const event = app.events.privateMessage({ text: '查看垂钓', platform: 'qq-bot', userId: 'player', messageId: 'fishing-expose-original' });
  const call = (name: string, input: Record<string, unknown>) => app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', name, input), 'ai-plugin');
  for (let i = 0; i < 2; i++) {
    const result = await call('get_fishing', { view: 'instances', speciesId: 'fishing_r2_b', page: 3, returnPage: 2 });
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
  }
  assert.notEqual(requests[0].idempotencyKey, requests[1].idempotencyKey);
  assert.deepEqual(requests[0].body.arguments, { view: 'instances', speciesId: 'fishing_r2_b', page: 3, returnPage: 2 });
  const preview = await call('preview_fishing_action', { kind: 'rod-upgrade', rodId: 'R186' });
  assert.equal(preview.value.ok, true, JSON.stringify(preview.value));
  if (preview.value.ok) assert.equal((preview.value.data as { result: { confirmationRef: string } }).result.confirmationRef, ref);
  assert.deepEqual(requests[2].body.arguments, { kind: 'rod-upgrade', rodId: 'R186' });
  for (let i = 0; i < 2; i++) {
    const result = await call('confirm_fishing_action', { ref });
    assert.equal(result.value.ok, true, JSON.stringify(result.value));
  }
  assert.deepEqual(requests[3].body.arguments, { ref });
  assert.equal(requests[3].idempotencyKey, requests[4].idempotencyKey);
  assert.ok(requests[3].path.endsWith('/fishing.confirm'));
});

test('赐福显式凡物0与礼包第四操作完整传服务端，原订单不改名',async t=>{
  const {app,requests}=await gameFixture(t,r=>businessEnvelope(r.bid,r.path.endsWith('fishing.pack-checkout')?{order:{orderNo:'FP20261104original',payAmount:600,status:'PENDING'},packageName:'稳如老狗',payUrl:'https://pay.example.test/original'}:view(r.path.endsWith('fishing.preview'))));
  await app.mount({expose:gameExpose},undefined,'xiuxian-game');
  const event=app.events.privateMessage({platform:'qq-bot',userId:'player',messageId:'fishing-fourth-op'});
  const call=(name:string,input:Record<string,unknown>)=>app.invoke(event,()=>Expose.create().call(GAME_EXPOSE_PROTOCOL,'xiuxian-game',name,input),'ai-plugin');
  const query=await call('get_fishing',{view:'blessing',blessingRealm:0});
  assert.equal(query.value.ok,true,JSON.stringify(query.value));
  assert.deepEqual(requests[0].body.arguments,{view:'blessing',blessingRealm:0});
  const checkout=await call('checkout_fishing_pack',{sku:'initial_steady'});
  assert.equal(checkout.value.ok,true,JSON.stringify(checkout.value));
  assert.deepEqual(requests[1].body.arguments,{sku:'initial_steady'});
  assert.ok(requests[1].path.endsWith('/fishing.pack-checkout'));
  const settings=await call('preview_fishing_action',{kind:'settings',settings:{autoChum:false,chumTier:0}});
  assert.equal(settings.value.ok,true,JSON.stringify(settings.value));
  for(const input of [
    {kind:'use-chum',chumType:'basic',quantity:7},
    {kind:'use-net',waterLevel:0,quantity:1},
    {kind:'settings',settings:{pushRareFish:false,pushFishKing:true}},
    {kind:'start',waterLevel:2,hours:6,rodId:'R1',baitType:'plain',baitCount:40,chumType:'basic',chumTier:0,chumCount:0},
    {kind:'start',waterLevel:2,hours:6,rodId:'R1',baitType:'plain',baitCount:40,chumType:'none',chumCount:0},
    {kind:'settings',settings:{autoBaitSwitch:false,baitOrder:[]}}
  ]){
    const result=await call('preview_fishing_action',input);
    assert.equal(result.value.ok,true,JSON.stringify(result.value));
    assert.deepEqual(requests.at(-1)?.body.arguments,input);
  }
  assert.deepEqual(requests[2].body.arguments,{kind:'settings',settings:{autoChum:false,chumTier:0}});
  const castId='fc_'+'a'.repeat(32);
  const cast=await call('get_fishing',{view:'cast',castId});
  assert.equal(cast.value.ok,true,JSON.stringify(cast.value));
  assert.deepEqual(requests.at(-1)?.body.arguments,{view:'cast',castId});
});

for (const [name, input] of [
  ['get_fishing', { view: 'overview', uid: 2 }],
  ['get_fishing', { view: 'instances', page: 0 }],
  ['preview_fishing_action', { kind: 'start', waterLevel: 2, hours: 2, rodId: 'R1', baitType: 'plain', baitCount: 40 }],
  ['preview_fishing_action', { kind: 'cashout', currency: 'dao', quantity: 1 }],
  ['preview_fishing_action', { kind:'settings',settings:{} }],
  ['preview_fishing_action', { kind:'settings',settings:{baitOrder:['plain','plain']} }],
  ['preview_fishing_action', { kind:'settings',settings:{autoChum:true,uid:2} }],
  ['confirm_fishing_action', { ref: ref.slice(0, -1) }],
  ['confirm_fishing_action', { ref: ref.replace('_y_', '_a_') }],
  ['confirm_fishing_action', { ref, ownerId: 2 }]
] as const) test(`垂钓expose拒绝越权/损坏/缺项并零后端访问：${name} ${JSON.stringify(input)}`, async t => {
  const { app, requests } = await gameFixture(t, () => { throw new Error('invalid expose must not request'); });
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const event = app.events.privateMessage({ platform: 'qq-bot', userId: 'player', messageId: 'invalid-fishing' });
  const result = await app.invoke(event, () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', name, input), 'ai-plugin');
  assert.equal(result.value.ok, false);
  assert.equal(requests.length, 0);
});
