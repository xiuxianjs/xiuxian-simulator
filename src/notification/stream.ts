import { dispatchChatNotices, startChatNotices, stopChatNotices } from './chat';
import { dispatchCommunityNotifications } from './communityDelivery';
import { getBackendConfig, getNotificationBackendConfig } from '@src/api/bot/config';
import { logger } from 'alemonjs';
import { PushMessageTask } from '@src/task/pushMessageTask';

let started = false;
let generation = 0;
let activeController: AbortController | undefined;
let cancelReconnect: (() => void) | undefined;

const dispatch = (controller: AbortController) => {
  const jobs = [PushMessageTask(), dispatchCommunityNotifications()];

  if (!getBackendConfig().channelMode) {
    jobs.push(dispatchChatNotices());
  }
  void Promise.all(jobs).catch(error => {
    logger.error('通知 SSE 投递失败，重新连接后补领', error);
    controller.abort();
  });
};

const consume = async (body: ReadableStream<Uint8Array>, controller: AbortController): Promise<void> => {
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
          dispatch(controller);
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
  const config = getBackendConfig();

  started = true;
  if (!config.channelMode) {
    startChatNotices();
  }
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

        if (!response.ok || !response.body) {
          void response.body?.cancel();
          throw new Error(`通知 SSE 连接失败: HTTP ${response.status}`);
        }
        const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();

        if (contentType !== 'text/event-stream') {
          void response.body.cancel();
          throw new Error(`通知 SSE 响应类型错误: HTTP ${response.status}, Content-Type ${contentType ?? '未提供'}`);
        }
        await consume(response.body, controller);
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
  stopChatNotices();
  generation++;
  activeController?.abort();
  cancelReconnect?.();
};
