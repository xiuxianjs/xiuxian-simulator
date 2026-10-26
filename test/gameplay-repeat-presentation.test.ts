import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { withEventContext } from 'alemonjs';
import { mockBackendConfig } from './backend-config-helper';
import learn from '../src/response-apps/skillBook/learn/app';
import unequipSkill from '../src/response-apps/skillBook/unequip/app';
import equip from '../src/response-apps/equipment/equipItem/app';
import unequipEquipment from '../src/response-apps/equipment/unequipItem/app';
import autoEquip from '../src/response-apps/equipment/autoEquip/app';
import lingzhi from '../src/response-apps/profession/joinLingzhi/app';
import consume from '../src/response-apps/consume/app';
import unequipSoul from '../src/response-apps/soulArtifact/unequip/app';
import cancelPeiyuan from '../src/response-apps/peiyuanDan/cancel/app';
import chest from '../src/response-apps/storyline/claimChest/app';
import allChests from '../src/response-apps/storyline/claimAllChests/app';
import viewLog from '../src/response-apps/battle/viewLog/app';
import decompose from '../src/response-apps/skillBook/decompose/app';
import switchSkill from '../src/response-apps/skillBook/switch/app';
import decomposeEquipment from '../src/response-apps/equipment/decompose/app';
import tool from '../src/response-apps/profession/replaceEquip/app';
import confirmPeiyuan from '../src/response-apps/peiyuanDan/confirm/app';
import mingwu from '../src/response-apps/mingwudan/confirm/app';
import breakthrough from '../src/response-apps/breakthrough/perform/app';
import sweep from '../src/response-apps/storyline/sweep/app';
import spar from '../src/response-apps/spar/app';
import { withBackendRepeatDetection } from '../src/utils/backendRepeatDetector';
import type { GameEvent } from '../src/types/event';
const request = { requestId: 'gameplay-repeat', idempotencyKey: 'message' };
const params = { bid: 'one', uid: 1, request };
const event = (command: string): GameEvent => ({ UserId: 'one', uid: 1, MessageId: 'message', Platform: 'qq-bot', MessageText: command, name: 'message.create' }) as unknown as GameEvent;
const book = (name: string, grade: string, realm: string) => ({ id: 1, name, grade, realm, gradeLevel: 1, proficiency: 0, skillType: '神通' });

test('local gameplay text projections consume the business response once, including multiline soul receipts and prefixed chests', async t => {
  mockBackendConfig(t, { api_url: 'https://gameplay-repeat.test', robot_auth_token: 'token' });
  let receipt: object = {};
  let command = '';
  let text = '';
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (config: { url: string; headers: Record<string, string> }) => {
    calls++;
    assert.equal(Buffer.from(config.headers['x-repeat-command'], 'base64').toString('utf8'), command);
    return { status: 200, headers: {}, data: JSON.stringify({ data: receipt, presentation: { repeat: { uid: 1, command, message: text, available: true, count: 3, suffix: '提示' } } }) };
  } }));
  const artifactPreview = { found: true, needsConfirmation: false, target: { instanceId: 7, name: '青莲', gradeId: 1, level: 0, panels: [] }, current: null, refundQuantity: 0, currentGradeName: '', targetGradeName: '', comparisonLines: [], refundLine: '' };
  const rows = [
    { command: '/学习功法 1', text: '当前待学功法品级低于已学功法\n\n已学：【旧书】【玄品】【筑基】\n待学：【新书】【黄品】【炼气】', data: { outcome: 'lower_grade', oldSkillBook: book('旧书', '玄品', '筑基'), skillBook: book('新书', '黄品', '炼气') }, run: () => learn({ ...params, skillBookId: 1, forceReplace: false, messageText: command }) },
    { command: '/换下战技', text: '当前没有使用中的战技', data: { outcome: 'not_in_use', skillBook: null }, run: () => unequipSkill({ ...params, skillTypeName: '战技', messageText: command }) },
    { command: ' /装备 剑 ', text: '未找到该装备', data: { outcome: 'not_found' }, run: () => equip({ ...params, identifier: '剑', messageText: command }) },
    { command: '/卸下 剑', text: '未找到剑类型的装备', data: { outcome: 'templates_missing', stage: 'none', instanceId: null }, run: () => unequipEquipment({ ...params, equipmentTypeName: '剑', messageText: command }) },
    { command: '/一键装备', text: '没有装备', data: { success: false, results: [], message: '没有装备' }, run: () => autoEquip({ ...params, messageText: command }) },
    { command: '/继续灵药指引', text: '你还未开始灵药师指引，请先使用 /加入灵药师', data: { completed: false }, run: () => lingzhi({ ...params, messageText: command }) },
    { command: '/炼化 7', text: '成功炼化本命物「青莲」\n原本命物「旧物」已自动分离（Lv.5已重置，退还筑灵石×1234567）', data: { preview: artifactPreview, consumed: null, equipped: { artifact: { id: 7, artifactId: 7, name: '青莲', gradeId: 1, level: 0, washCount: 0, category: '本命', isEquipped: true, isListed: false }, separated: { name: '旧物', previousLevel: 5, refundQuantity: 1234567 } } }, run: () => consume({ ...params, rawText: command }) },
    { command: '/分离 确认', text: '已分离「青莲」\n等级 Lv.5 → Lv.0（已重置）\n退还筑灵石 ×1234567（投入2345678的60%）\n品级和洗涤附加已保留', data: { outcome: 'unequipped', artifact: { name: '青莲', previousLevel: 5, refundQuantity: 1234567, totalCost: 2345678 } }, run: () => unequipSoul({ ...params, confirmed: true, messageText: command }) },
    { command: '取消培元丹', text: '❤ 没有待确认', data: { outcome: 'not_pending', message: '没有待确认', pendingJson: null }, run: () => cancelPeiyuan(params) },
    { command: '领取宝箱', text: '❌ 星数不足', data: { success: false, message: '星数不足', chapterNumber: 1, claimedIndexes: [], totalReward: 0, chests: [] }, run: () => chest({ ...params, chapterNumber: 1, chestIndex: 0 }) },
    { command: '一键领取宝箱', text: '❌ 没有宝箱', data: { success: false, message: '没有宝箱', totalReward: 0, claimedCount: 0, details: [] }, run: () => allChests(params) },
    { command: '/查看战斗过程 old', text: '战斗日志不存在或已过期（战斗日志保存5分钟）', data: { logId: 'old', text: null, readFailed: false }, run: () => viewLog({ ...params, logId: 'old', messageText: command }) }
  ];
  for (const row of rows) {
    command = row.command; text = row.text; receipt = row.data;
    const before = calls;
    await withEventContext(event(command), () => {}, async () => {
      const result = await row.run();
      if ('data' in result && result.data && 'message' in result.data) {
        const expected = command === '领取宝箱' || command === '一键领取宝箱' ? text.slice(2) : text;
        assert.equal(result.data.message, command.startsWith('/查看战斗过程') ? `${text}\n\n提示` : expected);
      } else if ('message' in result) {
        assert.equal(`❤ ${result.message}`, text);
      }
      if (!command.startsWith('/查看战斗过程')) {
        assert.equal(await withBackendRepeatDetection('one', 1, command, text, request), `${text}\n\n提示`);
      }
    });
    assert.equal(calls, before + 1, command);
  }
});

test('gameplay HTTP errors retain original App text and prefixes, including normalized spar and sweep, without repeat HTTP', async t => {
  mockBackendConfig(t, { api_url: 'https://gameplay-errors.test', robot_auth_token: 'token' });
  let command = '';
  let text = '';
  let status = 409;
  let code = 'CONFLICT';
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (config: { headers: Record<string, string> }) => {
    calls++;
    assert.equal(Buffer.from(config.headers['x-repeat-command'], 'base64').toString('utf8'), command);
    return { status, headers: {}, data: JSON.stringify({ error: { code, message: '原错误' }, presentation: { repeat: { uid: 1, command, message: text, available: true, count: 3, suffix: '提示' } } }) };
  } }));
  const rows = [
    { command: '/分解功法 7', text: '原错误', run: () => decompose({ ...params, skillBookId: 7, messageText: command }) },
    { command: '/切换战技 7', text: '原错误', run: () => switchSkill({ ...params, skillBookId: 7, skillTypeName: '战技', forceSwitch: false, messageText: command }) },
    { command: '/分解装备 7', text: '原错误', run: () => decomposeEquipment({ ...params, equipmentId: 7, messageText: command }) },
    { command: '切换天工', text: '❤ 原错误', run: () => tool({ ...params, messageText: '/替换 剑' }) },
    { command: '确认培元丹', text: '❤ 原错误', run: () => confirmPeiyuan(params) },
    { command: '/明悟丹参悟 7', text: '❌ 原错误', run: () => mingwu({ ...params, skillBookId: 7, quantity: 1, messageText: command }) },
    { command: '突破', text: '原错误', run: () => breakthrough(params) },
    { command: '/扫荡 1 1', text: '服务暂时不可用，请稍后再试', status: 500, code: 'INTERNAL', run: () => sweep({ ...params, chapterNumber: 1, stageNumber: 1, times: 1, messageText: command }) },
    { command: '比试', text: '比试失败：服务暂时不可用，请稍后再试', status: 500, code: 'INTERNAL', run: () => spar({ ...params, targetUid: 2 }) }
  ];
  for (const row of rows) {
    command = row.command; text = row.text; status = row.status ?? 409; code = row.code ?? 'CONFLICT';
    const before = calls;
    await withEventContext(event(command), () => {}, async () => {
      const result = await row.run();
      const appMessage = 'data' in result && result.data && typeof result.data === 'object' && 'message' in result.data ? result.data.message : 'message' in result ? result.message : undefined;
      const prefix = ['切换天工', '确认培元丹'].includes(command) ? '❤ ' : command.startsWith('/明悟丹参悟') ? '❌ ' : command === '比试' ? '比试失败：' : '';
      assert.equal(prefix + appMessage, text, command);
      assert.equal(await withBackendRepeatDetection('one', 1, command, text, request), `${text}\n\n提示`);
    });
    assert.equal(calls, before + 1, command);
  }
});
