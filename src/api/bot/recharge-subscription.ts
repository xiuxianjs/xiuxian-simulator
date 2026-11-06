import axios from 'axios';
import { Format, MessageDirect, isMaster, logger } from 'alemonjs';
import { assertChannelRobotEvent, getBackendConfig } from './config';
import { getAppConfig } from '@src/utils/appConfig';
import { assertNotificationReceipt, getNotificationPrivateTarget, rememberNotificationTarget } from '@src/notification/channel';
import type { GameEvent } from '@src/types/event';

type Result = { notice?: string; users?: string[]; deliveries?: { key: string; content: string }[] };
async function exchange(userId: string, action: string, extra: Record<string, unknown> = {}): Promise<Result> {
  const config = getBackendConfig();

  if (!config.channelMode) {
    throw new Error('充值订阅需要配置渠道 API。');
  }
  const endpoint = new URL(String(getAppConfig().support_api_origin ?? ''));

  if (
    (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(endpoint.hostname))) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== '/' ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new Error('请配置 support_api_origin 为渠道平台 HTTPS 地址。');
  }
  const response = await axios.post(
    `${endpoint.origin}/api/channel/v1/robot/recharge-subscription`,
    { appId: config.channelBotId, userId, action, localMaster: isMaster(userId, 'qq-bot'), ...extra },
    { timeout: config.timeoutMs, maxRedirects: 0, headers: { Authorization: `Bearer ${config.robotAuthToken}` } }
  );

  if (!response.data?.data || typeof response.data.data !== 'object') {
    throw new Error('充值订阅响应无效。');
  }

  return response.data.data;
}
export async function rechargeSubscriptionCommand(event: GameEvent, action: 'subscribe' | 'unsubscribe' | 'identity'): Promise<string> {
  assertChannelRobotEvent(event);
  if (!(event.IsPrivate || event.isPrivate || event.name.startsWith('private.'))) {
    throw new Error('请私聊机器人使用充值订阅。');
  }
  await rememberNotificationTarget(event);
  if (action === 'identity') {
    return `主人平台用户标识：${event.UserId}\n机器人：${event.BotId}\n请将标识交给渠道后台设置主人。`;
  }
  const result = await exchange(event.UserId, action);

  return result.notice ?? '操作已完成。';
}
export async function pollRechargeSubscriptions(): Promise<void> {
  const config = getBackendConfig();

  if (!config.channelMode || !getAppConfig().support_api_origin) {
    return;
  }
  const { users = [] } = await exchange('recharge-poller', 'users');

  for (const user of users) {
    const target = await getNotificationPrivateTarget('qq-bot', user, config.channelBotId);

    if (!target) {
      continue;
    }
    const result = await exchange(user, 'poll');

    for (const delivery of result.deliveries ?? []) {
      let status = 'sent';

      try {
        assertNotificationReceipt(await MessageDirect.create().sendToTarget({ target, format: Format.create().addText(delivery.content) }));
      } catch {
        status = 'unknown';
      }
      await exchange(user, 'ack', { key: delivery.key, status });
    }
  }
}
let timer: ReturnType<typeof setTimeout> | undefined;
let generation = 0;

export function startRechargeSubscriptions(): void {
  stopRechargeSubscriptions();
  const current = generation;
  const tick = async () => {
    try {
      await pollRechargeSubscriptions();
    } catch (error) {
      logger.error('充值提醒轮询失败', error instanceof Error ? error.message : 'unknown');
    }
    if (current === generation) {
      timer = setTimeout(() => void tick(), 10000);
    }
  };

  void tick();
}
export function stopRechargeSubscriptions(): void {
  generation++;
  clearTimeout(timer);
}
