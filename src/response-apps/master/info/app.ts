import { getBackendMasterInfo } from '@src/api/bot/master-info-queries';

export default function App(params: { bid: string | undefined; uid: number }) {
  return getBackendMasterInfo(params.bid, params.uid);
}
