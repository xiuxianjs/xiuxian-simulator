export interface GroupSubscriptionQueryData {
  platform: string;
  channelId: string;
  botId: string | null;
  targetScope: 'group' | 'channel';
  isEnabled: boolean;
  failureCount: number;
  lastDeliveryAt: string | null;
  lastError: string | null;
  channelState: { state: 'allowed' | 'blocked' | 'unknown'; retryAt?: number; source?: string; updatedAt?: number } | null;
}
