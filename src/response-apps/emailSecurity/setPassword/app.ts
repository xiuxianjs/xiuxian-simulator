/**
 * 设置密码 - 数据层
 */
import { BackendAPIError, setBackendPassword, type BackendRequestContext } from '@src/api';
import { logger } from 'alemonjs';

type SetPasswordResult =
  | { code: 'NOT_PRIVATE' }
  | { code: 'NO_PASSWORD'; minLength: number }
  | { code: 'TOO_SHORT'; minLength: number }
  | { code: 'USER_NOT_FOUND' }
  | { code: 'OK'; bid: string; uid: number };

function responseMinLength(error: BackendAPIError): number | undefined {
  const details = error.details;

  if (typeof details !== 'object' || details === null || !('minLength' in details)) {
    return undefined;
  }

  const minLength = details.minLength;

  return Number.isInteger(minLength) && Number(minLength) > 0 ? Number(minLength) : undefined;
}

export async function getSetPasswordData(
  uid: number,
  bid: string,
  isPrivate: boolean,
  messageText: string,
  request?: BackendRequestContext
): Promise<SetPasswordResult> {
  try {
    if (!isPrivate) {
      return { code: 'NOT_PRIVATE' };
    }

    const text = (messageText ?? '').trim();
    const match = text.match(/设置密码\s+(.+)/);
    const password = match?.[1]?.trim();

    if (!request) {
      return { code: 'USER_NOT_FOUND' };
    }
    const data = await setBackendPassword(bid, uid, password ?? '', request);

    return { code: 'OK', bid: data.bid, uid: data.playerId };
  } catch (error) {
    logger.error('[设置密码] 错误:', error);

    if (error instanceof BackendAPIError) {
      const minLength = responseMinLength(error);

      if (error.code === 'PASSWORD_REQUIRED' && minLength !== undefined) {
        return { code: 'NO_PASSWORD', minLength };
      }
      if (error.code === 'PASSWORD_TOO_SHORT' && minLength !== undefined) {
        return { code: 'TOO_SHORT', minLength };
      }
    }

    return { code: 'USER_NOT_FOUND' };
  }
}
