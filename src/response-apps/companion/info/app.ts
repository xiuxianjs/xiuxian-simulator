import { getBackendCompanionInfo } from '@src/api/bot/companion-info-queries';
import { presentCompanionInfo } from '@src/utils/companionQueryPresentation';
export default async function App(params: { bid: string | undefined; uid: number }) {
  return presentCompanionInfo(await getBackendCompanionInfo(params.bid, params.uid));
}
