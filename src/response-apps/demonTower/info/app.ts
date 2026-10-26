import { getBackendDemonTowerInfo } from '@src/api/bot/demon-tower-info-query';

export default function App(params: { uid: number; bid?: string }) {
  return getBackendDemonTowerInfo(params.bid, params.uid);
}
