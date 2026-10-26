import type { BackendRequestContext } from './context';
import { requestBackend } from './client';

// 协议（agreement）字段不再由机器人消费：协议判定与拒绝都留在服务端。
// 服务端入口响应仍会返回 agreementAccepted/agreements，此处刻意不读取、不校验。
export type BackendPlayerEntryResult = {
  maintenance: { disabled: boolean; reason?: string; endTime?: string };
  routeAllowed: boolean;
  featureGuard?: { blocked: boolean; feature?: string; reason?: string; realmName?: string };
  nativeComebackProcessed: boolean;
  resourcesSettled: boolean;
  processingError?: string;
};

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Send a registered player's platform message into the authoritative game
 * entry workflow. Maintenance, fixed realm eligibility, comeback eligibility,
 * resource settlement and their throttles all remain on the server.
 */
export async function enterBackendPlayer(bid: string, uid: number, messageText: string, request?: BackendRequestContext): Promise<BackendPlayerEntryResult> {
  const data: unknown = await requestBackend(bid, 'post_players_id_entry', {
    path: { id: uid },
    body: { messageText },
    requestId: request?.requestId
  });

  if (!record(data) || !record(data.maintenance) || typeof data.maintenance.disabled !== 'boolean') {
    throw new Error('玩家入口响应不完整');
  }
  if (typeof data.routeAllowed !== 'boolean' || typeof data.nativeComebackProcessed !== 'boolean' || typeof data.resourcesSettled !== 'boolean') {
    throw new Error('玩家入口处理状态格式无效');
  }
  if (data.processingError !== undefined && typeof data.processingError !== 'string') {
    throw new Error('玩家入口处理错误格式无效');
  }
  // Additive during backend rollout: old entry responses still reach the existing operation guards.
  if (data.featureGuard !== undefined && (!record(data.featureGuard) || typeof data.featureGuard.blocked !== 'boolean')) {
    throw new Error('玩家入口功能资格格式无效');
  }
  if (
    record(data.featureGuard) &&
    ((data.featureGuard.feature !== undefined && typeof data.featureGuard.feature !== 'string') ||
      (data.featureGuard.reason !== undefined && typeof data.featureGuard.reason !== 'string') ||
      (data.featureGuard.realmName !== undefined && typeof data.featureGuard.realmName !== 'string'))
  ) {
    throw new Error('玩家入口功能资格格式无效');
  }
  const { maintenance } = data;

  if (
    (maintenance.reason !== undefined && typeof maintenance.reason !== 'string') ||
    (maintenance.endTime !== undefined && typeof maintenance.endTime !== 'string')
  ) {
    throw new Error('玩家入口维护状态格式无效');
  }

  return data as unknown as BackendPlayerEntryResult;
}
