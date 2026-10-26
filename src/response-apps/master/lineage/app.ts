import { getBackendMasterLineage } from '@src/api/bot/master-lineage-queries';

export default function App(params: { uid: number; bid?: string }) {
  return getBackendMasterLineage(params.bid, params.uid);
}
