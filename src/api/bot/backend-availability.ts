import { logger } from 'alemonjs';
import axios from 'axios';
import { SDKError } from '../core/error';
import { DEFAULT_API_BASE } from '../core/helpers';

const failureWindowMs = 60_000;
const failureThreshold = 3;

type Availability = { onUnavailable?: () => void };
type RouteState = { key: string; failures: number[]; usingFallback: boolean };

let routeState: RouteState | undefined;

export function selectBackendRoute(url: string, apiBase: string, fallbackUrl: string, channelMode: boolean) {
  const key = JSON.stringify([url, apiBase, fallbackUrl, channelMode]);

  if (routeState?.key !== key) {
    routeState = { key, failures: [], usingFallback: false };
  }
  const state = routeState;

  if (state.usingFallback) {
    return { url: fallbackUrl, apiBase: DEFAULT_API_BASE };
  }
  if (!fallbackUrl || (url === fallbackUrl && apiBase === DEFAULT_API_BASE)) {
    return { url, apiBase };
  }

  return {
    url,
    apiBase,
    onUnavailable: () => {
      if (routeState !== state || state.usingFallback) {
        return;
      }
      const now = performance.now();

      state.failures = state.failures.filter(time => now - time < failureWindowMs);
      state.failures.push(now);
      if (state.failures.length >= failureThreshold) {
        state.usingFallback = true;
        logger.warn('修仙后端主地址在一分钟内发生三次不可用，新请求切换至 api_url。');
      }
    }
  };
}

export function recordBackendStatus(config: Availability, status: number, hasBusinessError: boolean): void {
  if ([502, 503, 504].includes(status) || (status === 404 && !hasBusinessError)) {
    config.onUnavailable?.();
  }
}

export function recordBackendError(config: Availability, error: unknown): void {
  if (error instanceof SDKError) {
    if (['SDK_TIMEOUT', 'SDK_NETWORK_ERROR', 'SDK_INVALID_RESPONSE'].includes(error.code)) {
      config.onUnavailable?.();
    } else if (error.status !== undefined) {
      recordBackendStatus(config, error.status, error.code !== 'SDK_HTTP_ERROR');
    }
  } else if (axios.isAxiosError(error)) {
    if (error.response) {
      recordBackendStatus(config, error.response.status, typeof error.response.data?.error?.code === 'string');
    } else if (error.request || ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code ?? '')) {
      if (error.code !== 'ERR_CANCELED') {
        config.onUnavailable?.();
      }
    }
  }
}

export async function observeBackendRequest<T>(config: Availability, send: () => Promise<T>): Promise<T> {
  try {
    return await send();
  } catch (error) {
    recordBackendError(config, error);
    throw error;
  }
}
