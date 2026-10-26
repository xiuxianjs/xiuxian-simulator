import { sendBackendGuildRedPacket } from '@src/api/bot/guild-red-packet-mutations';
import type { BackendRequestContext } from '@src/api/bot/context';

type CurrencyType = 'spirit_stone' | 'spirits_crystal' | 'contribution';
type PacketCount = 5 | 10 | 15 | 20 | 25 | 30;
type PerAmount = 100 | 1000 | 10000 | 100000;
type AppResult = { code: 'OK'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  currencyType: CurrencyType;
  packetCount: PacketCount;
  perAmount: PerAmount;
  request?: BackendRequestContext;
}): Promise<AppResult> {
  try {
    const result = await sendBackendGuildRedPacket(
      params.bid,
      params.uid,
      { currencyType: params.currencyType, packetCount: params.packetCount, perAmount: params.perAmount },
      params.request
    );

    return { code: 'OK', data: { message: result.message } };
  } catch (error: any) {
    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '发红包失败，请稍后再试。' } };
  }
}
