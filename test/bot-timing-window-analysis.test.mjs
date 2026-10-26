import assert from 'node:assert/strict';
import {test} from 'node:test';
import {analyzeBotTimings} from '../tools/analyze-bot-timings.mjs';
import {analyzeBotTimings as before} from './fixtures/bot-timing-native/analyzer-before.mjs';
const span=(stage,sequence,start,end,extra={})=>({requestId:'r',eventTraceId:'e',commandKey:'shop.list',stage,spanSequence:sequence,durationMs:end-start,startedFromEventStartMs:start,elapsedFromEventStartMs:end,outcome:'fulfilled',...extra});
const api=(sequence,start,end)=>({requestId:'r',eventTraceId:'e',commandKey:'shop.list',operationId:'get_players_id_shop_products',requestSequence:sequence,durationMs:end-start,startedFromEventStartMs:start,elapsedFromEventStartMs:end,outcome:'success'});
const analyze=rows=>analyzeBotTimings(rows.map(x=>JSON.stringify(x)).join('\n'));
test('send tail remains in legacy fields but never becomes foreground window bottleneck',()=>{
 const out=analyze([api(1,10,30),span('platform.send',1,35,60),api(2,1300,2300)]),x=out.samples[0],c=out.commands[0];
 assert.equal(x.phases.business.unionMs,1020);assert.equal(x.phases.business.observedSendWindowUnionMs,20);
 assert.equal(x.largestObservedIndependentPhase,'business');assert.equal(x.largestObservedSendWindowPhase,'send-attempt');
 assert.equal(c.phaseDistributions.business.p95Ms,1020);assert.equal(c.observedSendWindowPhaseDistributions.business.p95Ms,20);
 assert.deepEqual(c.observedSendWindowBottleneckCandidates,{'send-attempt':1});assert.equal(x.observedLastSendEndMs,60);assert.equal(x.measuredWindowUnionMs,45);
});
test('cross-window concurrent APIs clip before merging and nested cache never adds twice',()=>{
 const x=analyze([api(1,10,100),api(2,20,80),span('image.cache.miss',1,5,100),span('image.render',2,5,40),span('image.upload',3,40,100),span('platform.send',4,50,60)]).samples[0];
 assert.equal(x.phases.business.observedSendWindowUnionMs,50);assert.equal(x.phases.upload.observedSendWindowUnionMs,20);
 assert.equal(x.phases['cache-wait-inclusive'].observedSendWindowUnionMs,55);assert.equal(x.measuredWindowUnionMs,55);
 assert.equal(x.largestObservedSendWindowPhase,'business');assert.notEqual(Object.values(x.phases).reduce((n,v)=>n+(v.observedSendWindowUnionMs??0),0),x.measuredWindowUnionMs);
});
test('no observed send and unknown/inconsistent start never manufacture window samples',()=>{
 for(const rows of [[api(1,10,50)],[api(1,10,50),{...span('platform.send',1,50,60),startedFromEventStartMs:undefined}],[{...api(1,10,50),durationMs:1},span('platform.send',1,50,60)]]){
  const out=analyze(rows);assert.equal(out.samples[0].observedLastSendEndMs,null);assert.equal(out.samples[0].largestObservedSendWindowPhase,null);
  assert.ok(Object.values(out.samples[0].phases).every(x=>x.observedSendWindowUnionMs===null));assert.equal(out.commands[0].observedSendWindowPhaseDistributions.business.samples,0);
 }
});
test('phase wholly after endpoint is known zero window and absent phase remains unknown',()=>{
 const x=analyze([span('platform.send',1,20,30),api(1,40,100)]).samples[0];assert.equal(x.phases.business.observedSendWindowUnionMs,0);assert.equal(x.phases.render.observedSendWindowUnionMs,null);assert.equal(x.largestObservedSendWindowPhase,'send-attempt');
});
test('last of multiple observed sends sets clipping endpoint without claiming delivery',()=>{
 const x=analyze([span('platform.send',1,20,30),span('platform.send',2,25,50),api(1,35,70)]).samples[0];
 assert.equal(x.observedLastSendEndMs,50);assert.equal(x.phases['send-attempt'].observedSendWindowUnionMs,30);assert.equal(x.phases.business.observedSendWindowUnionMs,15);assert.match(x.sendState,/receipt-and-display-unknown/);assert.ok(x.missingBoundaries.includes('last-observed-send-is-not-proof-all-sends-completed'));
});
test('cross-event join gets only its own clipped wait and legacy collision stays excluded',()=>{
 const a=span('image.cache.join',1,10,100),b=span('platform.send',2,30,40);
 const out=analyze([a,b,span('image.render',1,0,100,{requestId:'r2',eventTraceId:'e2'}),span('platform.send',2,100,120,{requestId:'r2',eventTraceId:'e2'})]);
 const x=out.samples[0];assert.equal(x.phases.render.observedSendWindowUnionMs,null);assert.equal(x.phases['cache-wait-inclusive'].observedSendWindowUnionMs,30);assert.equal(x.largestObservedSendWindowPhase,'cache-join-wait');
 const collision=analyze([{...a,eventTraceId:undefined},{...a,eventTraceId:undefined,durationMs:20,elapsedFromEventStartMs:30},b]);assert.equal(collision.samples[0].largestObservedSendWindowPhase,null);
});
test('new fields are strictly additive: complete original fields preserved',()=>{
 const rows=[api(1,10,100),span('platform.send',1,20,40)],jsonl=rows.map(x=>JSON.stringify(x)).join('\n');
 const old=before(jsonl),now=analyzeBotTimings(jsonl);
 delete now.operationStatistics;
 for(const x of now.samples){assert.equal(x.eventKind,'unknown');assert.equal(x.ambiguousEventKind,false);assert.equal(x.phases['route-import'].state,'not-observed-possibly-not-required');delete x.phases['route-import'];delete x.eventKind;delete x.ambiguousEventKind;assert.equal(x.phases['response-build'].state,'not-observed-possibly-not-required');delete x.phases['response-build'];delete x.largestObservedSendWindowPhase;for(const phase of Object.values(x.phases))delete phase.observedSendWindowUnionMs;}
 for(const x of now.commands){assert.equal(x.endpointStatsByEventKind.unknown.samples,x.processorToObservedLastSendAttemptEnd.samples);assert.equal(x.phaseDistributions['route-import'].samples,0);delete x.phaseDistributions['route-import'];delete x.endpointStatsByEventKind;assert.equal(x.phaseDistributions['response-build'].samples,0);delete x.phaseDistributions['response-build'];delete x.observedSendWindowPhaseDistributions;delete x.observedSendWindowPhaseDistributionsByEventKind;delete x.observedSendWindowBottleneckCandidates;}
 now.boundaries=now.boundaries.filter(x=>!x.startsWith('Legacy phase union/'));assert.deepEqual(now,old);assert.equal(now.schemaVersion,2);
});
