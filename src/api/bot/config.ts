import { getAppConfig } from '../../utils/appConfig';
import { isValidTimeout } from '../core/helpers';

const DEFAULT_TIMEOUT_MS = 10_000;

export function getBackendConfig() {
  if (typeof process === 'undefined') {
    throw new Error('机器人配置仅限服务端使用；浏览器请使用 createClient 显式配置身份');
  }
  const value = getAppConfig().backend ?? {};

  if (value.channel_mode !== undefined && typeof value.channel_mode !== 'boolean') {
    throw new Error('backend.channel_mode 必须为布尔值');
  }
  const timeoutMs = Number(value.api_timeout_ms);

  const config = {
    url: String(value.api_url ?? '')
      .trim()
      .replace(/\/+$/, ''),
    robotAuthToken: String(value.robot_auth_token ?? '').trim(),
    channelMode: value.channel_mode === true,
    channelBotId: String(value.channel_bot_id ?? '').trim(),
    timeoutMs: isValidTimeout(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
    logTransportTimings: value.log_transport_timings === true,
    logApiTimings: value.log_api_timings === true,
    workerToken: String(value.worker_token ?? '').trim()
  };

  if (config.channelMode) {
    if (!config.robotAuthToken || !/^[1-9]\d*$/.test(config.channelBotId)) {
      throw new Error('渠道通知需要 BOT_TOKEN 和 backend.channel_bot_id');
    }
    let endpoint: URL;

    try {
      endpoint = new URL(config.url);
    } catch {
      throw new Error('渠道 API 需要独立服务的有效 origin');
    }
    const localHTTP = endpoint.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(endpoint.hostname);

    if (
      (!localHTTP && endpoint.protocol !== 'https:') ||
      endpoint.username ||
      endpoint.password ||
      endpoint.pathname !== '/' ||
      endpoint.search ||
      endpoint.hash
    ) {
      throw new Error('渠道 API 需要 HTTPS origin；HTTP 仅允许本机回环 IP');
    }
  }

  return config;
}

export function assertChannelRobotEvent(event: { Platform: string; BotId?: string; Target?: { BotId?: string } }): void {
  const config = getBackendConfig();

  if (
    config.channelMode &&
    (event.Platform !== 'qq-bot' || event.BotId !== config.channelBotId || (event.Target?.BotId && event.Target.BotId !== config.channelBotId))
  ) {
    throw new Error('当前平台事件与渠道机器人配置不匹配');
  }
}

/** Notification gateways accept a merchant token only in explicitly enabled channel mode. */
export function getNotificationBackendConfig() {
  const config = getBackendConfig();
  const headers: Record<string, string> = {};

  if (!config.url) {
    throw new Error('通知 API 后端地址未配置');
  }
  if (config.channelMode) {
    headers.Authorization = `Bearer ${config.robotAuthToken}`;
  } else {
    if (!config.workerToken) {
      throw new Error('通知 API Worker Token 未配置');
    }
    headers['X-Worker-Token'] = config.workerToken;
  }

  return { ...config, headers };
}

export function getWorkerBackendConfig() {
  const config = getBackendConfig();

  if (config.channelMode) {
    throw new Error('此全服运营接口尚未支持渠道机器人');
  }

  return config;
}
