import { getBackendMasterRanking } from '@src/api';

export default function App(params: { bid?: string; uid: number }) {
  return getBackendMasterRanking(params.bid, params.uid);
}
