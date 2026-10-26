import { blockBackendUserByName } from '@src/api/bot/block-user-by-name';
import type { BackendRequestContext } from '@src/api/bot/context';
import { MSG_COMMON, MSG_FRIEND } from '@src/constants/messages';

export function parseBlockCommand(messageText: string): string | null {
  const match = (messageText?.trim() ?? '').match(/^[!！/#＃]?拉黑\s+(.+)$/);

  return match?.[1]?.trim() ?? null;
}

type Result = { code: 'OK' | 'NOT_FOUND' | 'FAIL'; data: { message: string } } | { code: 'LOCKED'; data: { realmName: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  targetName: string;
  repeatCommand?: string;
  request?: BackendRequestContext;
}): Promise<Result> {
  const result = await blockBackendUserByName(params.bid, params.uid, params.targetName, params.request, params.repeatCommand);

  if (result.outcome === 'locked') {
    return { code: 'LOCKED', data: { realmName: result.realmName ?? '未知' } };
  }
  if (result.outcome === 'target_not_found') {
    return { code: 'NOT_FOUND', data: { message: `未找到名为「${params.targetName}」的玩家` } };
  }
  if (result.outcome === 'blocked') {
    return { code: 'OK', data: { message: `已将${result.name}加入黑名单` } };
  }
  const messages = {
    self: MSG_FRIEND.CANNOT_BLOCK_SELF,
    target_missing: MSG_FRIEND.USER_NOT_EXISTS,
    full: '黑名单数量已达上限（100人）',
    already_blocked: MSG_FRIEND.ALREADY_BLOCKED,
    failed: MSG_COMMON.OPERATION_FAILED
  };

  return { code: 'FAIL', data: { message: messages[result.outcome] } };
}
