import axios from 'axios';
import { getBackendConfig } from './config';

/** 只保留接口诊断字段，不把 Axios config、请求头、Token 或响应原文写入日志。 */
type HTTPFailure = { response?: { data?: unknown; status?: number; headers?: Record<string, unknown> }; code?: string };

export function notificationResponseError(path: string, error: HTTPFailure): Error {
  const config = getBackendConfig();
  const redact = (value: unknown, limit = 300): string => {
    let text = typeof value === 'string' ? value.replace(/[\r\n\t]/g, ' ') : '';

    for (const secret of [config.robotAuthToken, config.workerToken]) {
      if (secret) {
        text = text.split(secret).join('[REDACTED]');
      }
    }

    return text.slice(0, limit);
  };

  const data = error.response?.data;
  const envelope = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const detail = envelope.error && typeof envelope.error === 'object' ? (envelope.error as Record<string, unknown>) : {};
  const status = error.response?.status;
  const code = redact(detail.code ?? error.code, 80);
  const message = redact(detail.message ?? envelope.error);
  const requestId = redact(detail.requestId ?? envelope.requestId ?? error.response?.headers?.['x-request-id'], 128);

  return Object.assign(
    new Error(
      `通知请求失败 path=${path} status=${status ?? '未响应'} code=${code || '未知'} message=${message || '未提供结构化错误'} requestId=${requestId || '未提供'}`
    ),
    {
      name: 'NotificationRequestError',
      path,
      status,
      code,
      requestId
    }
  );
}

export function notificationRequestError(path: string, error: unknown): Error {
  if (!axios.isAxiosError(error)) {
    return new Error(`通知请求失败 path=${path}，未获得 HTTP 响应`);
  }

  return notificationResponseError(path, error);
}
