import { getBackendNotificationHistory } from '@src/api/bot/notification-history-queries';

export default async function App(params: { uid: number; bid: string; page: number }) {
  return await getBackendNotificationHistory(params.bid, params.uid, params.page);
}
