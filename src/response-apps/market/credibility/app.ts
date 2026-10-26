import { marketCredibilityView } from '@src/api/bot/market-community-views';
import type { BackendRequestContext } from '@src/api/bot/context';
import type { MarketCredibilityInfo as CredibilityInfoData } from '@src/api/schemas/market-credibility';
import type { CodeResult } from '@src/types/result';

export type { CredibilityInfoData };

export type CredibilityInfoResult = CodeResult<'OK', 'LOAD_FAILED', CredibilityInfoData>;

export default async function App(params: { bid?: string; uid: number; request?: BackendRequestContext }): Promise<CredibilityInfoResult> {
  try {
    const data = await marketCredibilityView(params.bid, params.uid, params.request);

    return { code: 'OK', data };
  } catch {
    return { code: 'LOAD_FAILED', data: undefined };
  }
}
