import { consumeRepeatPresentation } from '@src/api/bot/repeat-presentation';
import { updateBackendRepeatRecord } from '@src/api/bot/repeat-record';
import type { BackendRequestContext } from '@src/api/bot/context';
export async function withBackendRepeatDetection(
  bid: string | undefined,
  uid: number,
  command: string,
  message: string,
  request?: BackendRequestContext
): Promise<string> {
  try {
    const presentation = consumeRepeatPresentation(bid, uid, command, message);

    if (presentation && !presentation.data) {
      return message;
    }
    const { suffix } = presentation?.data ?? (await updateBackendRepeatRecord(bid, uid, command, message, request));

    if (suffix) {
      return `${message}\n\n${suffix}`;
    }

    return message;
  } catch {
    return message;
  }
}
