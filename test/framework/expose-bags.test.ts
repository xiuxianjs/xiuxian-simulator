import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { Expose, shutdownLogger } from 'alemonjs';
import { createTestApp } from 'alemonjs/testing';
import { gameExpose, GAME_EXPOSE_PROTOCOL } from '../../src/expose';

after(() => shutdownLogger());
const stats = { physicalAttack: 5, magicAttack: 3, physicalDefense: 2, magicDefense: 2, hp: 10, speed: 1, physicalAttackPercent: 1.5, magicAttackPercent: 0, physicalDefensePercent: 0, magicDefensePercent: 0, hpPercent: 0, critRate: 0.2, critDamage: 1.5 };
const maxStats = Object.fromEntries(Object.entries(stats).map(([key, value]) => ['max' + key[0].toUpperCase() + key.slice(1), value * 2]));
const cases = [
  { action: 'get_equipment_bag', path: 'equipment/bag', filter: { equipmentType: '武器' }, data: { types: ['武器'], activeType: '武器', page: 2, total: 6, totalPages: 2, capabilities: [], items: [{ ...stats, id: 11, equipmentId: 5, isEquipped: 0, isLocked: 2, name: '剑', equipmentType: '武器', grade: '凡', displayName: '剑', displayEquipmentType: '武器', displayGrade: '凡', attributeParts: ['物攻+5'], canEquip: false, canLock: false, canDecompose: false, capabilities: [] }] } },
  { action: 'get_skill_book_bag', path: 'skill-books/bag', filter: { skillType: '战技' }, data: { skillType: '战技', page: 2, total: 6, totalPages: 2, capabilities: [], items: [{ ...stats, ...maxStats, gradeId: 1, id: 11, skillBookId: 6, status: 0, isLocked: 1, quantity: 2, identifiableCount: 0, displayName: '剑诀', displayGrade: '凡', displaySkillType: '战技', unidentified: false, attributeParts: ['物攻+5'], name: '剑诀', grade: '凡', realm: null, skillType: '战技', capabilities: [] }] } },
  { action: 'get_soul_artifact_bag', path: 'soul-artifacts/bag', filter: {}, data: { page: 2, total: 6, pageSize: 5, items: [{ id: 11, artifactId: 6, gradeId: 1, name: '鼎', gradeName: '凡', level: 2, washCount: 1, hasUpgraded: 0, isEquipped: 1, isLocked: 0, canRefine: false, canToggleLock: true, lockAction: 'lock' }] } },
  { action: 'get_profession_tool_bag', path: 'profession-tools/bag', filter: { typeName: '丹炉' }, data: { types: ['丹炉'], activeType: '丹炉', page: 2, total: 6, pageSize: 5, totalPages: 2, capabilities: [], items: [{ id: 11, toolId: 6, typeName: '丹炉', gradeId: 1, displayName: '丹炉', displayGrade: '凡', isEquipped: 1, isLocked: 0, canReplace: false, canToggleLock: true, capabilities: ['viewDetail'] }] } },
  { action: 'get_lootboxes', path: 'lootboxes', filter: {}, data: { page: 2, total: 6, pageSize: 5, items: [{ id: 11, lootboxId: 6, quantity: 2, name: '礼盒', description: '材料', capabilities: [{ kind: 'open', valid: true, options: [{ requestedCount: 10, effectiveCount: 2 }] }] }] } }
];
for (const entry of cases) for (const mode of ['success', 'empty', 'malformed', 'disabled', 'cancel'] as const) test(`${entry.action}: ${mode}`, async t => {
  const app = createTestApp({ config: { 'qq-bot': { app_id: '123' }, 'xiuxian-game': { backend: { api_url: 'https://offline.invalid', robot_auth_token: 'offline' }, expose: { enabled: mode !== 'disabled' } } } });
  t.after(() => app.dispose());
  await app.mount({ expose: gameExpose }, undefined, 'xiuxian-game');
  const controller = new AbortController();
  let calls = 0;
  let aborted = false;
  t.mock.method(axios, 'create', () => ({ request: async (request: any) => {
    calls++;
    const url = new URL(request.url);
    assert.equal(request.method, 'GET');
    assert.equal(request.headers['x-bid'], 'owner');
    const identity = url.pathname === '/api/v1/robot/identity';
    if (!identity) {
      assert.equal(url.pathname, `/api/v1/players/7/${entry.path}`);
      assert.equal(url.searchParams.get('page'), '2');
      for (const [key, value] of Object.entries(entry.filter)) assert.equal(url.searchParams.get(key), value);
      if (mode === 'cancel') return new Promise((_resolve, reject) => {
        request.signal.addEventListener('abort', () => { aborted = true; reject(new Error('cancelled')); }, { once: true });
        controller.abort();
      });
    }
    return { status: 200, headers: {}, data: JSON.stringify({ data: identity ? { bid: 'owner', account: { status: 'registered', playerId: 7 } } : mode === 'malformed' ? { ...entry.data, items: [{}] } : mode === 'empty' ? { ...entry.data, items: [] } : entry.data }) };
  } }));
  const result = await app.invoke(app.events.privateMessage({ platform: 'qq-bot', userId: 'owner' }), () => Expose.create().call(GAME_EXPOSE_PROTOCOL, 'xiuxian-game', entry.action, { page: 2, ...entry.filter }, { signal: controller.signal }), 'ai-plugin');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.messages, []);
  assert.equal(result.value.ok, mode === 'success' || mode === 'empty', JSON.stringify(result.value));
  assert.equal(calls, mode === 'disabled' ? 0 : 2);
  if (result.value.ok) {
    const data = result.value.data as any;
    assert.equal(data.page, 2);
    assert.equal(data.items.length, mode === 'empty' ? 0 : 1);
    if (mode === 'success') {
      assert.equal(data.items[0].id, 11);
      if (entry.action === 'get_equipment_bag') { assert.equal(data.items[0].isLocked, 2); assert.equal(data.items[0].physicalAttackPercent, 1.5); }
      if (entry.action === 'get_skill_book_bag') { assert.equal(data.items[0].physicalAttack, 5); assert.equal(data.items[0].maxPhysicalAttack, 10); assert.equal(data.items[0].maxCritRate, 0.4); assert.equal(data.items[0].gradeId, 1); assert.equal('realm' in data.items[0], false); }
      if (entry.action === 'get_lootboxes') assert.equal(data.items[0].capabilities[0].options[0].effectiveCount, 2);
    }
  } else if (mode === 'cancel') { assert.equal(result.value.error.code, 'ABORTED'); assert.equal(aborted, true); }
});
