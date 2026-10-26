import { BackendAPIError } from '@src/api';
import { claimBackendCelestialCheckIn } from '@src/api/bot/celestial-checkin';
import { presentCelestialCheckIn } from '@src/api/bot/signin-robot-query';
import type { BackendRequestContext } from '@src/api/bot/context';

export type CelestialSignInResult =
  { code: 'OK'; data: { message: string; ritualText?: string } } | { code: 'LOAD_FAILED'; data: { message: string; ritualText?: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<CelestialSignInResult> {
  try {
    const data = await claimBackendCelestialCheckIn(params.bid, params.uid, params.request, params.messageText);

    return presentCelestialCheckIn(data);
  } catch (error) {
    return { code: 'LOAD_FAILED', data: { message: error instanceof BackendAPIError ? error.message : '登仙台签到失败，请稍后再试。' } };
  }
}
