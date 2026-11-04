import axios from 'axios';
import { commandText } from '@src/utils/commandPrefix';
import { randomUUID } from 'node:crypto';
import { Format, MessageDirect } from 'alemonjs';
import { createBackendRequestContext } from './context';
import { assertChannelRobotEvent, getBackendConfig } from './config';
import { getAppConfig } from '@src/utils/appConfig';
import { assertNotificationReceipt, getNotificationPrivateTarget, rememberNotificationTarget } from '@src/notification/channel';
import type { GameEvent } from '@src/types/event';

type SupportDelivery = { sender?: string; id: string; platformUserId: string; content: string; dispatchKey: string };
export type SupportResult = {
  handled?: boolean;
  notice?: string;
  conversationId?: string;
  status?: string;
  deliveries?: SupportDelivery[];
  conversations?: { id: string; status: string }[];
};
export type SupportInput = { action: 'call' | 'claim' | 'reply' | 'close' | 'pending' | 'continue' | 'message'; conversationId?: string; content?: string };

export async function rememberCustomerSupportIdentity(event: GameEvent): Promise<void> {
  assertChannelRobotEvent(event);
  if (!getBackendConfig().channelMode) {
    throw new Error('客服功能仅用于渠道机器人。');
  }
  await rememberNotificationTarget(event);
}

export async function customerSupportCommand(event: GameEvent, input: SupportInput): Promise<SupportResult> {
  assertChannelRobotEvent(event);
  const backend = getBackendConfig();

  if (!backend.channelMode) {
    throw new Error('客服功能仅用于渠道机器人。');
  }
  const identity = createBackendRequestContext(event, 'customer-support');

  if (!identity.idempotencyKey) {
    throw new Error('平台消息缺少编号，请重新发送客服指令。');
  }
  await rememberNotificationTarget(event);

  return supportExchange({ appId: backend.channelBotId, userId: event.UserId, requestKey: identity.idempotencyKey }, input);
}

export async function pollCustomerSupport(): Promise<void> {
  const backend = getBackendConfig();

  if (!backend.channelMode || !getAppConfig().support_api_origin) {
    return;
  }
  await supportExchange({ appId: backend.channelBotId, userId: 'support-poller', requestKey: randomUUID() }, { action: 'poll' });
}
async function supportExchange(base: { appId: string; userId: string; requestKey: string }, input: SupportInput | { action: 'poll' }): Promise<SupportResult> {
  const backend = getBackendConfig();
  const origin = String(getAppConfig().support_api_origin ?? '').trim();
  let endpoint: URL;

  try {
    endpoint = new URL(origin);
  } catch {
    throw new Error('请配置 support_api_origin 为渠道管理平台地址。');
  }
  const localHTTP = endpoint.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(endpoint.hostname);

  if (
    (endpoint.protocol !== 'https:' && !localHTTP) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== '/' ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new Error('客服平台地址必须是 HTTPS origin。');
  }
  const post = async (payload: Record<string, unknown>) => {
    try {
      const response = await axios.post(
        `${endpoint.origin}/api/channel/v1/robot/support`,
        { ...base, ...payload },
        { timeout: backend.timeoutMs, maxRedirects: 0, headers: { Authorization: `Bearer ${backend.robotAuthToken}` } }
      );
      const result = response.data?.data;

      if (!result || typeof result !== 'object') {
        throw new Error('客服响应无效。');
      }

      return result as SupportResult;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(typeof error.response?.data?.message === 'string' ? error.response.data.message : '客服请求暂时失败，请用原指令核对会话。');
      }
      throw error;
    }
  };

  const result = await post(input);

  for (const delivery of result.deliveries ?? []) {
    const ack = (status: 'sent' | 'pending' | 'unknown') => post({ action: 'ack', deliveryId: delivery.id, deliveryStatus: status, deliveryKey: delivery.dispatchKey });
    const target = await getNotificationPrivateTarget('qq-bot', delivery.platformUserId, backend.channelBotId);

    if (!target) {
      await ack('pending');
      continue;
    }
    try {
      const receipt = await MessageDirect.create().sendToTarget({
        target,
        format: Format.create().addText(
          delivery.sender === 'system'
            ? delivery.content.replace(/\/(呼叫客服|继续等待|结束客服|接待|回复|客服)(?=\s|$|[，。])/g, value => commandText(value))
            : delivery.content
        )
      });

      assertNotificationReceipt(receipt);
    } catch {
      // A missing or ambiguous platform receipt must not cause an automatic resend.
      await ack('unknown');
      continue;
    }
    await ack('sent');
  }

  return result;
}

let polling = false;
let pollGeneration = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | undefined;

export function startCustomerSupportPolling(): void {
  if (polling || !getBackendConfig().channelMode || !getAppConfig().support_api_origin) {
    return;
  }
  polling = true;
  const generation = ++pollGeneration;
  const tick = () => {
    running = pollCustomerSupport()
      .catch(() => {})
      .finally(() => {
        if (polling && generation === pollGeneration) {
          timer = setTimeout(tick, 2000);
        }
      });
  };

  tick();
}
export async function stopCustomerSupportPolling(): Promise<void> {
  polling = false;
  ++pollGeneration;
  clearTimeout(timer);
  timer = undefined;
  await running;
}
