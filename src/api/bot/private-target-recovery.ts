import { logger } from 'alemonjs';
import { platformObservationOutbox } from '../../notification/platformObservationOutbox';
import { SDKError } from '../core/error';
import { isParameterRecord } from '../core/helpers';
import { getBackendConfig } from './config';
import type { RobotMiddlewareResult } from './middleware-entry';

export function capturePrivateTargetRecovery(bid: unknown, observedAt: unknown, input: unknown, config?: ReturnType<typeof getBackendConfig>) {
  if (
    typeof bid !== 'string' ||
    !bid ||
    typeof observedAt !== 'number' ||
    !Number.isSafeInteger(observedAt) ||
    observedAt <= 0 ||
    !isParameterRecord(input) ||
    !isParameterRecord(input.privateTarget)
  ) {
    return undefined;
  }
  const { platform, BotId, scope, targetId } = input.privateTarget;

  if (
    typeof platform !== 'string' ||
    !platform ||
    platform !== input.platform ||
    (scope !== 'c2c' && scope !== 'direct') ||
    typeof targetId !== 'string' ||
    !targetId ||
    (BotId !== undefined && typeof BotId !== 'string')
  ) {
    return undefined;
  }
  const backend = config ?? getBackendConfig();
  const queueScope = backend.notificationQueueScope;
  const botId = BotId ?? (backend.channelMode ? backend.channelBotId : undefined);

  if (backend.channelMode && botId !== backend.channelBotId) {
    return undefined;
  }
  const target = { platform, ...(botId ? { BotId: botId } : {}), scope, targetId } as const;
  const defer = () => {
    try {
      platformObservationOutbox.deferPrivateTarget(queueScope, platform, bid, target, observedAt);
    } catch (error) {
      logger.error('私聊地址待补写记录落盘失败', error);
    }
  };

  return {
    observedAt,
    scope: queueScope,
    record(result: RobotMiddlewareResult) {
      if (result.contextWarnings.includes('PRIVATE_TARGET_NOT_SAVED')) {
        defer();
      }
    },
    recordUnconfirmed(error: unknown) {
      if (!(error instanceof SDKError)) {
        return;
      }
      const { code, status } = error;

      if (
        code === 'SDK_TIMEOUT' ||
        code === 'SDK_NETWORK_ERROR' ||
        (code === 'SDK_INVALID_RESPONSE' && (status === undefined || status < 400)) ||
        (status !== undefined && status >= 500 && status <= 599)
      ) {
        defer();
      }
    }
  };
}
