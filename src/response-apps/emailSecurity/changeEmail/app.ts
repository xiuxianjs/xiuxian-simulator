import { beginBackendEmailVerification, type BackendRequestContext } from '@src/api';

type InitResult = { code: 'OK'; data: { oldEmail: string; newEmail: string; emailChangeCount: number } } | { code: 'FAIL'; data: { message: string } };

/** Go 服务端负责更换资格、邮件发送、验证码和确认后的原子邮箱更新。 */
export async function initiateChangeEmail(params: { bid: string; messageText: string; request?: BackendRequestContext }): Promise<InitResult> {
  const newEmail = parseNewEmailAddress(params.messageText);

  if (!newEmail) {
    return { code: 'FAIL', data: { message: '请输入新邮箱地址，格式：/更换邮箱 [新邮箱地址]' } };
  }
  if (!params.request) {
    return { code: 'FAIL', data: { message: '当前平台消息缺少唯一标识，无法安全提交写操作' } };
  }

  try {
    const data = await beginBackendEmailVerification(params.bid, 'changeEmail', newEmail, params.request);

    if (typeof data.currentEmail !== 'string') {
      throw new Error('邮箱验证响应不完整');
    }

    return { code: 'OK', data: { oldEmail: String(data.currentEmail ?? ''), newEmail, emailChangeCount: 0 } };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof Error ? error.message : '更换邮箱失败，请稍后再试' } };
  }
}

export function parseNewEmailAddress(messageText: string): string | null {
  const cleanText = messageText.replace(/^(!|！|\/|#|＃)?(更换邮箱)\s*/, '').trim();

  return cleanText || null;
}
