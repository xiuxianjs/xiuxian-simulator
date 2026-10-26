import type { TargetSelector } from '@src/api/schemas/social-workflows';

export async function resolvePositionTarget(
  _bid: string | undefined,
  targetArg: string,
  mention?: { findOne: () => Promise<{ count?: number; data?: { UserId?: string | null } | null }> }
): Promise<TargetSelector | null> {
  const text = targetArg.trim();
  const numeric = /^\d+$/.test(text) ? Number(text) : null;

  if (numeric !== null && Number.isFinite(numeric) && numeric > 0) {
    return { targetUid: String(numeric) };
  }
  if (!mention) {
    return null;
  }
  const user = await mention.findOne();

  if (!user?.count || !user.data?.UserId) {
    return null;
  }

  return { targetBid: user.data.UserId };
}

export async function resolveTransferTarget(
  _bid: string | undefined,
  messageText: string,
  mention?: { findOne: () => Promise<{ count?: number; data?: { UserId?: string | null } | null }> }
): Promise<TargetSelector | null> {
  const match = String(messageText ?? '').match(/(\d+)/);

  if (match) {
    const uid = Number(match[1]);

    return Number.isFinite(uid) && uid > 0 ? { targetUid: String(uid) } : null;
  }
  if (!mention) {
    return null;
  }
  const user = await mention.findOne();

  if (!user?.count || !user.data?.UserId) {
    return null;
  }

  return { targetBid: user.data.UserId };
}
