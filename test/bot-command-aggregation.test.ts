import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { mockBackendConfig } from './backend-config-helper';
import guide from '../src/response-apps/profession/joinLingzhi/app';
import challenge from '../src/response-apps/storyline/challenge/app';
import learn from '../src/response-apps/skillBook/batchLearn/app';
import spar from '../src/response-apps/spar/app';
import consume from '../src/response-apps/consume/app';
import unequip from '../src/response-apps/soulArtifact/unequip/app';
import { getBackendEquipmentDecomposeQuery } from '../src/api/bot/equipment-batch-decompose';
import { getBackendSkillBookDecomposeQuery } from '../src/api/bot/skill-book-batch-decompose';
import { getBackendTianshiBaoluPanel } from '../src/api/bot/tianshi-baolu-panel';
import { commandBackendWudao } from '../src/api/bot/skill-book-wudao';
import { commandBackendFlyMailMute } from '../src/api/bot/flymail-mute';
const request = { requestId: 'aggregate', idempotencyKey: 'message' };
test('all 11 business entries use one HTTP response and retain read/confirmation branches without a write context', async t => {
  mockBackendConfig(t, { api_url: 'https://commands.test', robot_auth_token: 'token' });
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  let receipt: object = {};
  t.mock.method(axios, 'create', () => ({ request: async (config: { url: string; headers: Record<string, string> }) => {
    calls.push(config);
    return { status: 200, headers: {}, data: JSON.stringify({ data: receipt }) };
  } }));
  const emptyEquipment = { success: false, message: '没有可分解的装备', totalCount: 0, processCount: 0, remainingCount: 0, totalYield: 0, gradeBreakdown: [] };
  const emptySkills = { success: false, message: '没有功法', totalCount: 0, processCount: 0, remainingCount: 0, totalExp: 0, gradeBreakdown: [], estimatedItems: [] };
  const artifactPreview = { found: false, needsConfirmation: false, target: null, current: null, refundQuantity: 0, currentGradeName: '', targetGradeName: '', comparisonLines: [], refundLine: '' };
  const cases = [
    { path: '/guide/continue-current', run: () => guide({ bid: 'one', uid: 1, messageText: '/继续灵药指引', request }), receipt: { completed: false }, check: (result: unknown) => assert.deepEqual(result, { code: 'FAIL', data: { message: '你还未开始灵药师指引，请先使用 /加入灵药师' } }) },
    { path: '/storyline/challenge-command', run: () => challenge({ bid: 'one', uid: 1, chapterNumber: 1, stageNumber: 1, request }), receipt: { sessionId: 'battle', finished: false, events: null } },
    { path: '/batch-learn-current', run: () => learn({ bid: 'one', uid: 1, request }), receipt: { selection: { candidates: [], skippedConflicts: [] }, results: [] } },
    { path: '/spar-command', run: () => spar({ bid: 'one', uid: 1, targetUid: 0, targetBid: 'actual-bid', request }), receipt: { allowed: true, realmName: '筑基', targetUid: 0, battle: null } },
    { path: '/equipment/batch-decompose-query', run: () => getBackendEquipmentDecomposeQuery('one', 1, '全部'), receipt: { options: emptyEquipment, preview: emptyEquipment } },
    { path: '/skill-books/batch-decompose-query', run: () => getBackendSkillBookDecomposeQuery('one', 1, '全部'), receipt: { options: emptySkills, preview: emptySkills } },
    { path: '/tianshi-baolu/panel-query', run: () => getBackendTianshiBaoluPanel('one', 1, 'all', 1), receipt: { newUnlockCount: 2, totalCount: 2, unlockedCount: 2, filteredCount: 2, totalBonusText: '', page: 1, totalPages: 1, rows: [] } },
    { path: '/wudao-command', run: () => commandBackendWudao('one', 1, 3, ''), receipt: { options: { skillBookId: 3, skillBookName: '书', ownedStones: 0, status: 'no_stone', message: '没有悟道石', options: [] }, result: null, failure: '' } },
    { path: '/refine-command', run: () => consume({ bid: 'one', uid: 1, rawText: '/炼化 7', request }), receipt: { preview: artifactPreview, equipped: null, consumed: { outcome: 'rejected', message: '物品不存在' } } },
    { path: '/unequip-command', run: () => unequip({ bid: 'one', uid: 1, confirmed: false }), receipt: { outcome: 'confirmation', artifact: { name: '青莲', previousLevel: 5, totalCost: 500, refundQuantity: 300 } }, check: (result: unknown) => assert.deepEqual(result, { code: 'CONFIRM', data: { name: '青莲', level: 5, totalCost: 500, refundQty: 300 } }) },
    { path: '/flymail/mute-command', run: () => commandBackendFlyMailMute('one', 1, 0, undefined, true), receipt: { access: { allowed: true, realmName: '炼气五层', targetUid: null }, result: null } }
  ];
  for (const entry of cases) {
    receipt = entry.receipt;
    const before = calls.length;
    const result = await entry.run();
    entry.check?.(result);
    assert.equal(calls.length, before + 1, entry.path);
    assert.ok(new URL(calls[before].url).pathname.endsWith(entry.path), calls[before].url);
  }
});
