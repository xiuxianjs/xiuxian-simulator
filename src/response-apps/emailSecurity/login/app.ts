import { BackendAPIError, issueBackendLoginWindow, type BackendRequestContext } from '@src/api';
import { getCommandErrorMessage } from '@src/utils/commandError';

type LoginWindowResult = { code: 'OK'; data: Awaited<ReturnType<typeof issueBackendLoginWindow>> } | { code: 'ERROR' | 'PASSWORD_NOT_SET'; message: string };

export async function getLoginWindowData(uid: number, bid: string, isPrivate: boolean, request: BackendRequestContext): Promise<LoginWindowResult> {
  if (!isPrivate) {
    return { code: 'ERROR', message: '请私聊机器人发送 /登录，临时密码仅通过私聊回复。' };
  }
  try {
    return { code: 'OK', data: await issueBackendLoginWindow(bid, uid, request) };
  } catch (error) {
    if (error instanceof BackendAPIError && error.code === 'PASSWORD_NOT_SET') {
      return { code: 'PASSWORD_NOT_SET', message: '请先设置固定密码。' };
    }
    if (error instanceof BackendAPIError && error.code === 'LOGIN_RATE_LIMITED') {
      return { code: 'ERROR', message: '请稍后再试，签发间隔为 60 秒。' };
    }

    return { code: 'ERROR', message: getCommandErrorMessage(error) };
  }
}
