import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseBackendPasswordResult} from '../src/api/bot/account';
import {parseRobotBusinessEnvelope} from '../src/api/bot/robot-business';

test('password result requires original v1 success shape and trusted envelope identity',()=>{
 const data={updated:true,playerId:1,bid:'player',minLength:6};
 assert.deepEqual(parseBackendPasswordResult(data),data);
 for(const value of [null,{},[],{...data,updated:false},{...data,playerId:0},{...data,bid:''},{...data,minLength:0}])assert.throws(()=>parseBackendPasswordResult(value));
 // The envelope validates the subject before the response callback handles DTO identity.
 assert.throws(()=>parseRobotBusinessEnvelope({success:true,branch:'business',player:{uid:2,bid:'foreign'},data},'player',value=>parseBackendPasswordResult(value)));
});
