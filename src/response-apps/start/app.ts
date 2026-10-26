import { BackendAPIError } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';
import { getBackendRobotIdentity } from '@src/api/bot/identity';
import { registerBackendPlayer } from '@src/api/bot/registration';
import { logger } from 'alemonjs';

export type StartAppResult =
  | { code: 'EXISTING_USER' }
  | { code: 'NEED_NAME' }
  | { code: 'INVALID_NAME'; data: { message: string } }
  | { code: 'NAME_TAKEN' }
  | { code: 'OK'; data: { playerName: string } }
  | { code: 'LOAD_FAILED' };

export default async function App(params: {
  bid: string;
  guildId?: string;
  channelId?: string;
  messageText?: string;
  request: BackendRequestContext;
}): Promise<StartAppResult> {
  try {
    const identity = await getBackendRobotIdentity(params.bid, params.request);

    if (identity.account.status === 'registered') {
      return { code: 'EXISTING_USER' };
    }

    const nameMatch = (params.messageText ?? '').match(/我是\s+(.+)\s*$/);
    const playerName = nameMatch?.[1]?.trim();

    if (!playerName) {
      return { code: 'NEED_NAME' };
    }

    const newUser = await registerBackendPlayer(params.bid, { name: playerName, region: params.guildId ?? params.channelId }, params.request);

    return { code: 'OK', data: { playerName: newUser.name } };
  } catch (error) {
    if (error instanceof BackendAPIError) {
      if (error.status === 409) {
        return { code: 'NAME_TAKEN' };
      }
      if (error.status === 400 || error.code === 'INVALID_ARGUMENT') {
        return { code: 'INVALID_NAME', data: { message: error.message || '道号不符合要求，请重新输入。' } };
      }
    }
    logger.error('创建存档失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
