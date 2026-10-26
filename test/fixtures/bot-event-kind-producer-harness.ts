import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FormatEvent } from 'alemonjs';
import { createBackendRequestContext, getEventTransportDiagnosticContext } from '../../src/api/bot/context';
import { createBackendRequestContext as originalAuthority } from './bot-backend-authority-before';

void test('installed FormatEvent names classify safely without changing request or replay identity', () => {
  for (const name of ['message.create', 'private.message.create', 'interaction.create', 'private.interaction.create'] as const) {
    const event = {
      ...FormatEvent.create(name).addPlatform({ Platform: 'qq-bot', value: { type: 11, timestamp: 'PRIVATE-RAW-TIMESTAMP' } }).value,
      UserId: 'PRIVATE-USER', BotId: 'PRIVATE-BOT', MessageId: 'PRIVATE-MESSAGE',
      InteractionId: name.includes('interaction') ? 'PRIVATE-INTERACTION' : undefined,
      MessageText: '/商店', Interaction: { requiresAck: true, acknowledged: true, data: 'PRIVATE-DATA' }
    };
    const authority = originalAuthority(event);

    assert.deepEqual(createBackendRequestContext(event), authority);
    const diagnostic = getEventTransportDiagnosticContext(event);

    assert.equal(diagnostic?.eventKind, name.includes('interaction') ? 'interaction' : 'message');
    assert.equal(diagnostic, getEventTransportDiagnosticContext(event));
    assert.doesNotMatch(JSON.stringify(diagnostic), /PRIVATE|timestamp|InteractionId|MessageId|UserId|acknowledged|requiresAck/);
    assert.deepEqual(createBackendRequestContext(event), authority);
    const absentIDs = { ...event, MessageId: undefined, InteractionId: undefined };

    assert.deepEqual(createBackendRequestContext(absentIDs), originalAuthority(absentIDs));
    assert.equal(createBackendRequestContext(absentIDs).idempotencyKey, undefined);
    assert.equal(getEventTransportDiagnosticContext(absentIDs)?.eventKind, diagnostic?.eventKind);
  }
  for (const event of [{}, { name: 'PRIVATE-INVALID', InteractionId: 'PRIVATE-ID', _tag: 'INTERACTION_CREATE_GROUP', value: { type: 11 } }, { name: 'message.delete' }]) {
    const diagnostic = getEventTransportDiagnosticContext(event);

    assert.equal(diagnostic?.eventKind, 'unknown');
    assert.doesNotMatch(JSON.stringify(diagnostic), /PRIVATE/);
  }
  assert.equal(getEventTransportDiagnosticContext(undefined), undefined);
});
