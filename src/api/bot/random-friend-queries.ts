import { requestBackend } from './client';
import type { RandomFriendQueryData } from '../schemas/random-friend-query';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('随机道友数据不完整');
  }

  return value as Record<string, unknown>;
}
function nullableText(value: unknown): string | null {
  if (value !== null && typeof value !== 'string') {
    throw new Error('随机道友文本字段不完整');
  }

  return value;
}
export async function getBackendRandomFriend(bid: string | undefined, uid: number): Promise<RandomFriendQueryData> {
  if (!bid?.trim()) {
    throw new Error('查询缺少平台身份');
  }
  if (!Number.isSafeInteger(uid) || uid <= 0) {
    throw new Error('随机道友查询参数无效');
  }

  return parseBackendRandomFriend(await requestBackend(bid, 'get_players_id_friends_random', { path: { id: uid } }));
}

export function parseBackendRandomFriend(value: unknown): RandomFriendQueryData {
  const data = record(value);
  const access = record(data.access);

  if (typeof access.ok !== 'boolean' || (!access.ok && data.player !== null)) {
    throw new Error('随机道友资格字段不完整');
  }
  let player: RandomFriendQueryData['player'] = null;

  if (data.player !== null) {
    const row = record(data.player);

    if (typeof row.uid !== 'number' || !Number.isSafeInteger(row.uid) || row.uid < 1 || typeof row.name !== 'string') {
      throw new Error('随机道友信息字段不完整');
    }
    player = { uid: row.uid, name: row.name, realmName: nullableText(row.realmName), activeTitle: nullableText(row.activeTitle) };
  }

  return { access: { ok: access.ok, realmName: nullableText(access.realmName) }, player };
}
