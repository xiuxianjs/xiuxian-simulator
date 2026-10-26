import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { withEventContext } from 'alemonjs';
import { mockBackendConfig } from './backend-config-helper';

import { startBackendMeditation, settleBackendMeditation } from '../src/api/bot/meditation';
import { consumeBackendItem } from '../src/api/bot/consume';
import { refineBackendSoulArtifact } from '../src/api/bot/soul-artifact-commands';
import { upgradeBackendSoulArtifactLevel } from '../src/api/bot/soul-artifact-upgrade';
import { withBackendRepeatDetection } from '../src/utils/backendRepeatDetector';
import type { GameEvent } from '../src/types/event';

const context = { requestId: 'repeat-cultivation', idempotencyKey: 'message' };
const message = ' 原文本\n💔不改变前缀与空格 ';
const config = { QI_PER_INTERVAL: 1, INTERVAL_MINUTES: 1, EXP_PER_INTERVAL: 1, MAX_DURATION_MINUTES: 1 };
const preview = { found: false, needsConfirmation: false, target: null, current: null, refundQuantity: 0, currentGradeName: '', targetGradeName: '', comparisonLines: [], refundLine: '' };

test('cultivation business helpers carry original repeat command and consume presentation with exactly one HTTP', async t => {
  mockBackendConfig(t, { api_url: 'https://cultivation-repeat.test', robot_auth_token: 'token' });
  let receipt: object = {};
  let expectedCommand = '';
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async (request: { headers: Record<string, string> }) => {
    calls++;
    assert.equal(Buffer.from(request.headers['x-repeat-command'], 'base64').toString('utf8'), expectedCommand);
    return { status: 200, headers: {}, data: JSON.stringify({ data: receipt, presentation: { repeat: { uid: 1, command: expectedCommand, message, available: true, count: 3, suffix: '原重复提示' } } }) };
  } }));
  const rows = [
    { command: ' /打坐 ', run: () => startBackendMeditation('one', 1, context, expectedCommand), receipt: { success: false, message, config, passPreview: { maxDurationMinutes: 1, qiBonusRate: 0, expBonusRate: 0 } } },
    { command: ' /结束打坐 ', run: () => settleBackendMeditation('one', 1, context, expectedCommand), receipt: { success: false, message, dailyQiCap: 1, minimumRewardMinutes: 1 } },
    { command: '/服用 丹药', run: () => consumeBackendItem('one', 1, { itemName: '丹药', quantity: 1 }, context, expectedCommand), receipt: { outcome: 'rejected', message } },
    { command: '/炼化 7', run: () => refineBackendSoulArtifact('one', 1, 7, false, context, expectedCommand), receipt: { preview, equipped: null, consumed: { outcome: 'rejected', message } } },
    { command: ' /本命物升级 5 ', run: () => upgradeBackendSoulArtifactLevel('one', 1, 5, context, expectedCommand), receipt: { artifact: { id: 1, name: '青莲', level: 5 }, previousLevel: 0, actualLevels: 5, cost: 5, comparison: [], message, compareLines: [] } }
  ];
  for (const row of rows) {
    receipt = row.receipt;
    expectedCommand = row.command;
    const e = { UserId: 'one', MessageId: 'message', Platform: 'qq-bot', MessageText: row.command, name: 'message.create' } as GameEvent;
    const before = calls;
    await withEventContext(e, () => {}, async () => {
      await row.run();
      assert.equal(await withBackendRepeatDetection('one', 1, row.command, message, context), `${message}\n\n原重复提示`);
    });
    assert.equal(calls, before + 1, row.command);
  }
});

test('upgrade HTTP rejection retains status and exact text while consuming same-response repeat', async t => {
  mockBackendConfig(t, { api_url: 'https://cultivation-upgrade-error.test', robot_auth_token: 'token' });
  const command = ' /本命物升级 5 ';
  let calls = 0;
  t.mock.method(axios, 'create', () => ({ request: async () => {
    calls++;
    return { status: 409, headers: {}, data: JSON.stringify({ error: { code: 'CONFLICT', message }, presentation: { repeat: { uid: 1, command, message, available: true, count: 3, suffix: '原重复提示' } } }) };
  } }));
  const e = { UserId: 'one', MessageId: 'message', Platform: 'qq-bot', MessageText: command, name: 'message.create' } as GameEvent;
  await withEventContext(e, () => {}, async () => {
    await assert.rejects(upgradeBackendSoulArtifactLevel('one', 1, 5, context, command), { code: 'CONFLICT', status: 409, message });
    assert.equal(await withBackendRepeatDetection('one', 1, command, message, context), `${message}\n\n原重复提示`);
    assert.equal(calls, 1);
  });
});
