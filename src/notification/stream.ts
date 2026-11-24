import { recordBackendStatus } from '../api/bot/backend-availability';
import { notificationResponseError } from '../api/bot/notification-error';
import { dispatchChatNotices, startChatNotices, stopChatNotices } from './chat';
import { dispatchCommunityNotifications } from './communityDelivery';
import { getNotificationBackendConfig, hasNotificationBackendUrl } from '@src/api/bot/config';
import { logger, onWatchConfigValue } from 'alemonjs';
import { getQQBotAppIds } from '../utils/qqBotIdentity';
import { PushFlyMailTask, dispatchStandardMessages, wakeFlyMailTask, wakeStandardMessages } from '@src/task/pushMessageTask';
import { NotificationDispatcher, type NotificationWakeupScope } from './dispatch';

let started = false;
let stopWaitingForConfig: (() => void) | undefined;
let warnedMissingBackendUrl = false;
let generation = 0;
let activeController: AbortController | undefined;
let cancelReconnect: (() => void) | undefined;

let activeDispatcher: NotificationDispatcher | undefined;

function notificationWakeupScope(lines: string[]): NotificationWakeupScope | undefined {
  const data = lines
    .filter(line => line === 'data' || line.startsWith('data:'))
    .map(line => line.slice(5).replace(/^ /, ''))
    .join('\n');

  try {
    const scope: unknown = JSON.parse(data)?.scope;

    return scope === 'chat' || scope === 'relay' || scope === 'flymail' || scope === 'standard' || scope === 'community' ? scope : undefined;
  } catch {
    return undefined;
  }
}

const consume = async (body: ReadableStream<Uint8Array>, controller: AbortController, dispatcher: NotificationDispatcher): Promise<void> => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let splitCommunity = false;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => controller.abort(), 60_000);
  };

  try {
    resetIdleTimer();
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        throw new Error('通知 SSE 连接已关闭');
      }
      resetIdleTimer();
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let boundary = buffer.indexOf('\n\n');

      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary);

        buffer = buffer.slice(boundary + 2);
        const lines = frame.split('\n');
        const event = lines
          .find(line => line.startsWith('event:'))
          ?.slice(6)
          .trim();

        if (event === 'stream.ready') {
          splitCommunity = notificationWakeupScope(lines) === 'community';
          dispatcher.wake();
        } else if (event === 'notification.ready') {
          const scope = notificationWakeupScope(lines);

          dispatcher.wake(scope);
          if (scope === 'relay' && !splitCommunity) {
            dispatcher.wake('community');
          }
        }
        boundary = buffer.indexOf('\n\n');
      }
      if (buffer.length > 65_536) {
        throw new Error('通知 SSE 事件过大');
      }
    }
  } finally {
    clearTimeout(idleTimer);
    reader.releaseLock();
  }
};

export const startNotificationStream = (): void => {
  if (started) {
    return;
  }
  const hasBackendUrl = hasNotificationBackendUrl();

  if (!hasBackendUrl && !warnedMissingBackendUrl) {
    warnedMissingBackendUrl = true;
    logger.warn('修仙通知流等待后端地址，请配置 xiuxian-game.backend.api_base_url 或 api_url。');
  }
  if (!getQQBotAppIds().length || !hasBackendUrl) {
    stopWaitingForConfig ??= onWatchConfigValue(startNotificationStream);

    return;
  }
  stopWaitingForConfig?.();
  stopWaitingForConfig = undefined;
  warnedMissingBackendUrl = false;
  started = true;
  const dispatcher = new NotificationDispatcher([
    { name: '飞信', scope: 'flymail', run: PushFlyMailTask, wakeRunning: wakeFlyMailTask },
    { name: '玩家通知', scope: 'standard', run: dispatchStandardMessages, wakeRunning: wakeStandardMessages },
    { name: '群通知', scope: 'community', run: dispatchCommunityNotifications },
    { name: '运营消息', scope: 'chat', run: dispatchChatNotices }
  ]);

  activeDispatcher = dispatcher;
  startChatNotices();
  const currentGeneration = ++generation;

  void (async () => {
    let retryDelay = 1_000;

    while (true) {
      if (currentGeneration !== generation) {
        break;
      }
      const connectedAt = Date.now();
      let controller: AbortController | undefined;

      try {
        const config = getNotificationBackendConfig();

        controller = new AbortController();

        activeController = controller;
        const connectionTimer = setTimeout(() => controller?.abort(), 10_000);
        let response: Response;

        try {
          response = await fetch(`${config.url}${config.apiBase}/v1/internal/notification-relay/events/stream?communityScope=1`, {
            headers: { ...config.headers, Accept: 'text/event-stream' },
            cache: 'no-store',
            ...(config.channelMode ? { redirect: 'error' } : {}),
            signal: controller.signal
          });
        } catch (error) {
          if (currentGeneration === generation) {
            config.onUnavailable?.();
          }
          throw error;
        } finally {
          clearTimeout(connectionTimer);
        }

        if (!response.ok) {
          const data = response.headers.get('content-type')?.includes('application/json') ? await response.json().catch(() => undefined) : undefined;

          if (currentGeneration === generation) {
            recordBackendStatus(config, response.status, typeof data?.error?.code === 'string');
          }
          void response.body?.cancel();
          throw notificationResponseError(`${config.apiBase}/v1/internal/notification-relay/events/stream`, {
            response: {
              status: response.status,
              data,
              headers: { 'x-request-id': response.headers.get('x-request-id') }
            }
          });
        }
        if (!response.body) {
          config.onUnavailable?.();
          throw new Error('通知 SSE 响应缺少事件流');
        }
        const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();

        if (contentType !== 'text/event-stream') {
          config.onUnavailable?.();
          void response.body.cancel();
          throw new Error(`通知 SSE 响应类型错误: HTTP ${response.status}, Content-Type ${contentType ?? '未提供'}`);
        }
        await consume(response.body, controller, dispatcher);
      } catch (error) {
        if (currentGeneration === generation) {
          logger.error('通知 SSE 中断，准备重连', error);
        }
      } finally {
        if (activeController === controller) {
          activeController = undefined;
        }
      }
      if (currentGeneration !== generation) {
        break;
      }
      if (Date.now() - connectedAt > 30_000) {
        retryDelay = 1_000;
      }
      await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, retryDelay);
        const cancel = () => {
          clearTimeout(timer);
          resolve();
        };

        cancelReconnect = cancel;
      });
      if (currentGeneration === generation) {
        cancelReconnect = undefined;
      }
      retryDelay = Math.min(retryDelay * 2, 30_000);
    }
  })();
};

export const stopNotificationStream = (): void => {
  started = false;
  stopWaitingForConfig?.();
  stopWaitingForConfig = undefined;
  warnedMissingBackendUrl = false;
  stopChatNotices();
  activeDispatcher?.stop();
  activeDispatcher = undefined;
  generation++;
  activeController?.abort();
  cancelReconnect?.();
};
