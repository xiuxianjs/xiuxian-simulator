import { notificationResponseError } from '../api/bot/notification-error';
import { dispatchChatNotices, startChatNotices, stopChatNotices } from './chat';
import { dispatchCommunityNotifications } from './communityDelivery';
import { getNotificationBackendConfig } from '@src/api/bot/config';
import { logger, onWatchConfigValue } from 'alemonjs';
import { getQQBotAppIds } from '../utils/qqBotIdentity';
import { PushFlyMailTask, dispatchStandardMessages } from '@src/task/pushMessageTask';
import { NotificationDispatcher } from './dispatch';

let started = false;
let stopWaitingForAppId: (() => void) | undefined;
let generation = 0;
let activeController: AbortController | undefined;
let cancelReconnect: (() => void) | undefined;

let activeDispatcher: NotificationDispatcher | undefined;

const consume = async (body: ReadableStream<Uint8Array>, controller: AbortController, dispatcher: NotificationDispatcher): Promise<void> => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
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
        const event = frame
          .split('\n')
          .find(line => line.startsWith('event:'))
          ?.slice(6)
          .trim();

        if (event === 'stream.ready' || event === 'notification.ready') {
          dispatcher.wake();
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
  if (!getQQBotAppIds().length) {
    stopWaitingForAppId ??= onWatchConfigValue(() => startNotificationStream());

    return;
  }
  stopWaitingForAppId?.();
  stopWaitingForAppId = undefined;
  started = true;
  const dispatcher = new NotificationDispatcher([
    { name: '飞信', run: PushFlyMailTask },
    { name: '玩家通知', run: dispatchStandardMessages },
    { name: '群通知', run: dispatchCommunityNotifications },
    { name: '运营消息', run: dispatchChatNotices }
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
          response = await fetch(`${config.url}/api/v1/internal/notification-relay/events/stream`, {
            headers: { ...config.headers, Accept: 'text/event-stream' },
            cache: 'no-store',
            ...(config.channelMode ? { redirect: 'error' } : {}),
            signal: controller.signal
          });
        } finally {
          clearTimeout(connectionTimer);
        }

        if (!response.ok) {
          const data = response.headers.get('content-type')?.includes('application/json') ? await response.json().catch(() => undefined) : undefined;

          void response.body?.cancel();
          throw notificationResponseError('/api/v1/internal/notification-relay/events/stream', {
            response: {
              status: response.status,
              data,
              headers: { 'x-request-id': response.headers.get('x-request-id') }
            }
          });
        }
        if (!response.body) {
          throw new Error('通知 SSE 响应缺少事件流');
        }
        const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();

        if (contentType !== 'text/event-stream') {
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
  stopWaitingForAppId?.();
  stopWaitingForAppId = undefined;
  stopChatNotices();
  activeDispatcher?.stop();
  activeDispatcher = undefined;
  generation++;
  activeController?.abort();
  cancelReconnect?.();
};
