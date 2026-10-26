import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRecoveryEffects, parseRecoverySummary, recoveryEffectText, type RecoveryEffect } from '../src/api/schemas/resource-recovery';
import { getBackendAttributePanel } from '../src/api/bot/attribute-panel';
import { mockBackendConfig } from './backend-config-helper';
import axios from 'axios';

const source: RecoveryEffect = { source: 'equipment_set', templateId: 12, name: '玄冰', mp: 10, mental: 0, pieces: 4, currentPieces: 3, active: false, status: 'insufficient_pieces', statusText: '未凑齐', conditionText: '集齐4件生效；重复模板不多算。' };
const summary = { configured: true, enabled: true, cap: 40, mpTotal: 50, mentalTotal: 0, mp: 40, mental: 0, sources: [source], note: '作用于常规恢复；满值不储存溢出；合体归念不受加成。' };

test('recovery projection preserves inactive sources, cap and percent precision', () => {
  assert.deepEqual(parseRecoverySummary(summary), summary);
  assert.match(recoveryEffectText(source), /玄冰（3\/4件）：回灵效率 \+10% · 未凑齐/);
  assert.equal(parseRecoverySummary(undefined), undefined);
  assert.deepEqual(parseRecoveryEffects(null), []);
  assert.match(recoveryEffectText({...source, mp: 10.25}), /10.25%/);
  assert.doesNotMatch(recoveryEffectText({...source, status: 'preview'}), /3\/4/);
  assert.throws(() => parseRecoverySummary({...summary, mp: 41}));
  assert.throws(() => parseRecoveryEffects([{...source, mp: '10'}]));
});

test('attribute adapter retains both efficiency fields and server source summary', async t => {
  mockBackendConfig(t, {api_url:'http://backend.test', robot_auth_token:'test-token', api_timeout_ms:10000});
  const numeric = ['maxAttributeBonus','strength','maxStrength','intelligence','maxIntelligence','constitution','maxConstitution','agility','maxAgility','luck','maxLuck','combatPower','physicalAttack','physicalDefense','magicAttack','magicDefense','spiritualPower','mentalPower','hp','speed','critRate','critDamage','antiCritRate','hitRate','dodgeRate'];
  const data = {...Object.fromEntries(numeric.map(key=>[key,0])),daoName:'测试',uid:1,realmName:'元婴后期',theme:null,access:{canUseMeridian:true,canUseSoulArtifact:true,canUseSoulPath:true},mpRecoveryEfficiency:40,mentalRecoveryEfficiency:0,resourceRecovery:summary};
  t.mock.method(axios, 'create', () => ({request: async () => ({status:200,headers:{},data:JSON.stringify({data})})}));
  const parsed=await getBackendAttributePanel('bid',1);
  assert.equal(parsed.mpRecoveryEfficiency,40);
  assert.equal(parsed.mentalRecoveryEfficiency,0);
  assert.deepEqual(parsed.resourceRecovery,summary);
});
