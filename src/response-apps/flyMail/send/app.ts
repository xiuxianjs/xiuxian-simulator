import type { FlyMailScope } from '@src/api/schemas/fly-mail-query';
import type { BackendRequestContext } from '@src/api/bot/context';
import { sendBackendFlyMail } from '@src/api/bot/flymail-send';

export { parseFlyMailSendCommand } from '@src/utils/flyMailCommand';
export async function sendFlyMailThroughBackend(params: {
  bid: string | undefined;
  uid: number;
  scope: FlyMailScope;
  content: string;
  targetUid?: number;
  request?: BackendRequestContext;
}): Promise<{ message: string }> {
  return await sendBackendFlyMail(params);
}
