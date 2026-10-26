import { getBackendRobotIdentity } from '@src/api/bot/identity';

type MentionUser = {
  count?: number;
  data?: {
    UserId?: string | null;
  } | null;
};

type MentionHandler = {
  findOne: () => Promise<MentionUser>;
};

export const parsePositiveUid = (value?: string | number | null) => {
  const text = String(value ?? '').trim();

  if (!text) {
    return null;
  }

  if (!/^\d+$/.test(text)) {
    return null;
  }

  const uid = Number(text);

  if (!Number.isSafeInteger(uid) || uid <= 0) {
    return null;
  }

  return uid;
};

export const resolveMentionUid = async (mention?: MentionHandler) => {
  if (!mention) {
    return null;
  }

  const user = await mention.findOne();

  if (!user?.count || !user.data?.UserId) {
    return null;
  }

  const identity = await getBackendRobotIdentity(user.data.UserId);

  return identity.account.status === 'registered' ? identity.account.playerId : null;
};

export const resolveTargetUid = async (messageText: string, mention?: MentionHandler) => {
  const uidMatch = String(messageText ?? '').match(/(\d+)/);

  if (uidMatch) {
    return parsePositiveUid(uidMatch[1]);
  }

  return await resolveMentionUid(mention);
};

export const resolveTargetUidFromArg = async (targetArg?: string | null, mention?: MentionHandler) => {
  const uid = parsePositiveUid(targetArg);

  if (uid) {
    return uid;
  }

  return await resolveMentionUid(mention);
};

/** A v2 target selector carries facts, never performs a game identity request. */
export type RobotTarget = { uid: number } | { bid: string };

export const resolveRobotTarget = async (messageText: string, mention?: MentionHandler): Promise<RobotTarget | null> => {
  const uidMatch = String(messageText ?? '').match(/(\d+)/);

  if (uidMatch) {
    const uid = parsePositiveUid(uidMatch[1]);

    return uid ? { uid } : null;
  }
  if (!mention) {
    return null;
  }
  const user = await mention.findOne();

  return user?.count && user.data?.UserId ? { bid: user.data.UserId } : null;
};

/** Preserve argument-first target selection without requesting game identity. */
export const resolveRobotTargetFromArg = async (targetArg?: string | null, mention?: MentionHandler): Promise<RobotTarget | null> => {
  const uid = parsePositiveUid(targetArg);

  if (uid) {
    return { uid };
  }
  if (!mention) {
    return null;
  }
  const user = await mention.findOne();

  return user?.count && user.data?.UserId ? { bid: user.data.UserId } : null;
};
