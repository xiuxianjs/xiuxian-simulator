import { createHmac, timingSafeEqual } from 'node:crypto';

export type HarvestTicket = {
  version: 1;
  caller: string;
  platform: string;
  botId: string;
  userId: string;
  channelId: string;
  private: boolean;
  playerId: number;
  inputId: string;
  backend: string;
  dueAt: number;
  everyMs: number;
  expiresAt: number;
  plotIndex: number;
};
const mac = (payload: string, secret: string) => createHmac('sha256', secret).update('xiuxian.scheduled-harvest.v1\0').update(payload).digest();

export function signHarvestTicket(ticket: HarvestTicket, secret: string): string {
  if (!secret) {
    throw new Error('预约授权签名未配置');
  }
  const payload = Buffer.from(JSON.stringify(ticket)).toString('base64url');

  return `${payload}.${mac(payload, secret).toString('base64url')}`;
}

export function readHarvestTicket(value: string, secret: string): HarvestTicket {
  if (!secret || typeof value !== 'string' || value.length > 4096 || !/^[\w-]+\.[\w-]{43}$/u.test(value)) {
    throw new Error('预约授权无效');
  }
  const [payload, signature] = value.split('.');
  const digest = Buffer.from(signature, 'base64url');

  if (digest.length !== 32 || digest.toString('base64url') !== signature || !timingSafeEqual(digest, mac(payload, secret))) {
    throw new Error('预约授权校验失败');
  }
  const bytes = Buffer.from(payload, 'base64url');

  if (bytes.toString('base64url') !== payload) {
    throw new Error('预约授权编码无效');
  }
  const ticket = JSON.parse(bytes.toString('utf8')) as HarvestTicket;

  if (
    ticket?.version !== 1 ||
    !ticket.caller ||
    ticket.platform !== 'qq-bot' ||
    !ticket.botId ||
    !ticket.userId ||
    !ticket.inputId ||
    typeof ticket.private !== 'boolean' ||
    (!ticket.private && !ticket.channelId) ||
    !ticket.backend ||
    !Number.isSafeInteger(ticket.playerId) ||
    ticket.playerId <= 0 ||
    !Number.isSafeInteger(ticket.plotIndex) ||
    ticket.plotIndex < 0 ||
    ticket.plotIndex > 2147483647 ||
    !Number.isSafeInteger(ticket.dueAt) ||
    !Number.isSafeInteger(ticket.expiresAt) ||
    ticket.dueAt >= ticket.expiresAt ||
    !Number.isSafeInteger(ticket.everyMs) ||
    ticket.everyMs < 0 ||
    (ticket.everyMs !== 0 && ticket.everyMs < 60000)
  ) {
    throw new Error('预约授权内容无效');
  }

  return ticket;
}
