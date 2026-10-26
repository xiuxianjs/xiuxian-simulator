import axios from 'axios';
import { getWorkerBackendConfig } from './config';
import { backendConnectionPools } from './connection-pools';

export type ChatClaim = {
  scope?: 'c2c' | 'group';
  noticeId: string;
  contactId: number;
  botId: string;
  openId: string;
  token: string;
  content: string;
  mode: 'wakeup' | 'proactive';
};
export type ChatReceipt = Pick<ChatClaim, 'noticeId' | 'contactId' | 'botId' | 'token'> & {
  status: 'sent' | 'failed' | 'unknown' | 'skipped';
  messageId: string;
  error: string;
  platformCode?: number;
};

async function post<T>(path: string, data: unknown): Promise<T> {
  const config = getWorkerBackendConfig();

  if (!config.url || !config.workerToken) {
    throw new Error('消息管理 API 未配置');
  }
  const response = await axios
    .create({ ...backendConnectionPools, baseURL: config.url, timeout: config.timeoutMs, headers: { 'X-Worker-Token': config.workerToken } })
    .post<T>(`/chat/internal/${path}`, data);

  return response.data;
}

export const rememberChatContact = (botId: string, openId: string, bid: string) => post('contact', { botId, openId, bid });
export const claimChatNotice = (botId: string) => post<ChatClaim | null>('claim', { botId });
export type ChatScope = 'c2c' | 'group';
export const claimNextChatNotice = (botId: string, scope: ChatScope = 'c2c') => post<{ claim: ChatClaim | null; pending: boolean }>('claim-next', { botId, scopes: [scope] });
export const finishChatNotice = (receipt: ChatReceipt) => post('receipt', receipt);

export type ChatContact = { botId: string; openId: string; relationState: 0 | 1 | 2 | 3; relationAt: number; groupSeen: boolean; enabled: boolean };
export type ChatContactObservation = {
  botId: string;
  openId: string;
  bid: string;
  kind: 'group' | 'private' | 'removed' | 'group_leave' | 'group_join' | 'group_exit' | 'group_allow' | 'group_block';
  groupId?: string;
  memberId?: string;
  aliasId?: string;
  timeUnknown?: boolean;
  occurredAt: number;
  groupSeen: boolean;
};
export type ChatGroup = {
  id: number;
  botId: string;
  groupId: string;
  name: string;
  state: 0 | 1 | 3;
  enabled: boolean;
  permission: string;
  presenceAt: number;
  lastSeenAt: number;
  relationUnknown: boolean;
};
export const observeChatContacts = (items: ChatContactObservation[]) => post<{ items: ChatContact[]; groups?: ChatGroup[] }>('contacts/observe', { items });
